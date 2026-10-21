import {useCallback, useEffect, useRef, useState} from "react";
import {exit} from "@tauri-apps/api/app";
import {CheckMenuItem, Menu, MenuItem, Submenu} from "@tauri-apps/api/menu";
import type {SubmenuOptions} from "@tauri-apps/api/menu";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {message, open as openFileDialog} from "@tauri-apps/plugin-dialog";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    COLOR_THEMES,
    useSettings,
    type ColorThemeId,
    type ThemeMode,
} from "@/hooks/use-settings";
import {useProjectSave} from "@/hooks/use-project-save";
import {useBuilder} from "@/lib/builder-store";
import {HOME_TAB_ID, IMPORT_TAB_ID, useWorkspace} from "@/lib/workspace-store";
import {describeError, QCP_FILTERS} from "@/lib/qcp";
import {QR_SOURCE_FILTERS} from "@/lib/qr-import";
import {detectOS, isTauriRuntime} from "@/lib/tauri";

import {version as APP_VERSION} from "../../../package.json";

/** État de l'application reflété par les items de la menubar native. */
type MenuSettings = {
    mode: ThemeMode;
    colorTheme: ColorThemeId;
    hud: boolean;
    animations: boolean;
    isHome: boolean;
    /** Onglet d'import actif : les actions de brouillon sont suspendues. */
    isImport: boolean;
    canUndo: boolean;
    canRedo: boolean;
};

/** Actions applicatives déclenchées par la menubar native. */
type MenuActions = {
    newProject(): void;
    openQcp(): void;
    importQr(): void;
    save(): void;
    saveAs(): void;
    exportImage(): void;
    about(): void;
    setMode(mode: ThemeMode): void;
    setColorTheme(theme: ColorThemeId): void;
    toggleHud(): void;
    toggleAnimations(): void;
    undo(): void;
    redo(): void;
    closeTab(): void;
    quit(): void;
    syncChecks(): void;
};

/** Instances d'items natifs dont l'état est réaligné par le front. */
type MenuItems = {
    modeLight: CheckMenuItem;
    modeDark: CheckMenuItem;
    themes: CheckMenuItem[];
    hud: CheckMenuItem;
    animations: CheckMenuItem;
    draft: MenuItem[];
    undo: MenuItem;
    redo: MenuItem;
    close: MenuItem;
};

/** Descripteur d'item accepté par un sous-menu Tauri (instance ou options). */
type ItemSpec = NonNullable<SubmenuOptions["items"]>[number];

/**
 * Menubar native de l'application (barre système macOS, menu de fenêtre
 * Windows/Linux), construite avec l'API menu de Tauri. Composant presque
 * sans rendu : seuls les dialogs « À propos » et de confirmation de sortie
 * apparaissent. Hors shell Tauri (dev navigateur), rien n'est construit.
 *
 * - « Eventages QrCode Studio » (menu applicatif macOS) : à propos, masquage, quitter
 *   (⌘Q, confirmation de sortie) ;
 * - « Fichier » : cycle de vie du projet (création ⌘N, ouverture .qrd ⌘O,
 *   import d'un QR existant ⌘I, fermeture de l'onglet ⌘W — sur l'onglet
 *   Accueil, sortie de l'application, toujours confirmée et avec
 *   enregistrement proposé si le projet est modifié —, enregistrement
 *   ⌘S/⌘⇧S, export ⇧⌘E) — les entrées qui agissent sur le brouillon sont
 *   désactivées sur l'onglet Accueil ; « Quitter » (⌃Q) hors macOS ;
 * - « Édition » : Annuler/Rétablir branchés sur l'historique applicatif du
 *   brouillon (⌘Z/⇧⌘Z — les rôles natifs ne savent annuler que la saisie
 *   webview, pas les changements de projet), puis rôles natifs du
 *   presse-papiers (⌘X/⌘C/⌘V/⌘A) — indispensables dans les champs ;
 * - « Affichage » : mode clair / sombre, thèmes de couleurs, ornements HUD
 *   et animations (mêmes réglages que la boîte de paramètres) ;
 * - « Fenêtre » : classement natif (réduire, zoom, toutes au premier plan) ;
 * - « Aide » : à propos.
 *
 * Le menu est construit une seule fois au montage ; coches, activations et
 * libellés sont réalignés à chaque changement d'état via les instances
 * d'items, et les actions relisent les dernières closures par référence —
 * jamais de reconstruction du menu natif. Les demandes de fermeture natives
 * (traffic lights, Alt+F4, croix Windows/Linux) passent par la même
 * confirmation de sortie que les items de menu.
 */
export function NativeMenu({onExport}: {onExport: () => void}) {
    const {
        state,
        dirty,
        canUndo,
        canRedo,
        undo,
        redo,
        saveProject,
        flushActiveProject,
        openProjectFromQcp,
    } = useBuilder();
    const {activeTabId, createProjectTab, openProjectTab, closeProjectTab, startQrImport} =
        useWorkspace();
    const {
        mode,
        setMode,
        colorTheme,
        setColorTheme,
        hud,
        setHud,
        animations,
        setAnimations,
    } = useSettings();
    const {runSave} = useProjectSave();
    const [aboutOpen, setAboutOpen] = useState(false);
    /** Sortie en cours : "confirm" (projet propre), "unsaved" (modifié), null. */
    const [quitDialog, setQuitDialog] = useState<"confirm" | "unsaved" | null>(null);
    // Verrou anti-double sortie (double activation d'un bouton du dialog).
    const quittingRef = useRef(false);
    const isHome = activeTabId === HOME_TAB_ID;
    const isImport = activeTabId === IMPORT_TAB_ID;

    // Réglages et état de dernière minute : les items natifs, construits
    // une seule fois, relisent ces refs à chaque activation (jamais périmés).
    const settingsRef = useRef<MenuSettings>({
        mode,
        colorTheme,
        hud,
        animations,
        isHome,
        isImport,
        canUndo,
        canRedo,
    });
    settingsRef.current = {mode, colorTheme, hud, animations, isHome, isImport, canUndo, canRedo};
    const itemsRef = useRef<MenuItems | null>(null);
    const actionsRef = useRef<MenuActions | null>(null);

    /** Ouvre un fichier .qrd : réactive le projet s'il est déjà connu. */
    const openQcpFile = async () => {
        try {
            const selection = await openFileDialog({
                multiple: false,
                directory: false,
                filters: QCP_FILTERS,
            });
            if (typeof selection !== "string") return;
            const {id} = await openProjectFromQcp(selection);
            openProjectTab(id);
        } catch (cause) {
            await reportError("Ouverture du projet", cause, "Ouverture du fichier projet impossible.");
        }
    };

    /**
     * Importe un QR ou un code-barres existant : l'ouverture de l'onglet
     * d'import et la progression y sont gérées (pas de dialogue d'erreur
     * natif — l'échec s'affiche dans le panneau de conversion).
     */
    const importQrFile = async () => {
        try {
            const selection = await openFileDialog({
                multiple: false,
                directory: false,
                filters: QR_SOURCE_FILTERS,
            });
            if (typeof selection !== "string") return;
            startQrImport(selection);
        } catch (cause) {
            await reportError("Import d'un code", cause, "Import du fichier impossible.");
        }
    };

    /** Demande de sortie : simple confirmation, alerte renforcée si modifié. */
    const requestQuit = () => setQuitDialog(dirty ? "unsaved" : "confirm");

    /**
     * Sortie confirmée : enregistre d'abord si demandé (sans quitter si la
     * boîte « Enregistrer sous » est annulée ou en cas d'échec), puis ferme
     * l'application.
     */
    const confirmQuit = async (saveFirst: boolean) => {
        if (quittingRef.current) return;
        quittingRef.current = true;
        setQuitDialog(null);
        if (saveFirst) {
            try {
                const path = await saveProject();
                if (!path) {
                    quittingRef.current = false;
                    return;
                }
            } catch (cause) {
                quittingRef.current = false;
                await reportError(
                    "Enregistrement du projet",
                    cause,
                    "Enregistrement du projet impossible.",
                );
                return;
            }
        }
        // Écrit le brouillon dans le registre local, puis ferme l'application.
        flushActiveProject();
        await exit(0);
    };

    actionsRef.current = {
        newProject: () => void createProjectTab(),
        openQcp: () => void openQcpFile(),
        importQr: () => void importQrFile(),
        save: () => void runSave("save"),
        saveAs: () => void runSave("saveAs"),
        exportImage: onExport,
        about: () => setAboutOpen(true),
        setMode: (value) => setMode(value),
        setColorTheme: (value) => setColorTheme(value),
        toggleHud: () => setHud(!settingsRef.current.hud),
        toggleAnimations: () => setAnimations(!settingsRef.current.animations),
        undo: () => undo(),
        redo: () => redo(),
        closeTab: () => {
            // ⌘W : ferme l'onglet projet courant ; sur l'accueil, l'onglet
            // n'est pas fermable — c'est l'application qui se ferme.
            if (settingsRef.current.isHome) {
                requestQuit();
                return;
            }
            closeProjectTab(activeTabId);
        },
        quit: () => requestQuit(),
        syncChecks: () => {
            if (itemsRef.current) syncChecks(itemsRef.current, settingsRef.current);
        },
    };

    /**
     * Réaligne l'ensemble des états d'items natifs sur l'état courant :
     * coches des réglages, activation des actions de brouillon et d'annulation
     * (onglet projet requis), libellé de fermeture selon l'onglet.
     */
    const syncMenu = useCallback(() => {
        const items = itemsRef.current;
        if (!items) return;
        syncChecks(items, settingsRef.current);
        const {isHome, isImport, canUndo, canRedo} = settingsRef.current;
        // Hors onglet projet (accueil, import en cours) : pas de brouillon
        // éditable — enregistrement, export et annulation suspendus.
        const hasDraft = !isHome && !isImport;
        for (const item of items.draft) void item.setEnabled(hasDraft);
        void items.undo.setEnabled(hasDraft && canUndo);
        void items.redo.setEnabled(hasDraft && canRedo);
        void items.close.setText(isHome ? "Fermer Eventages QrCode Studio" : "Fermer l'onglet");
    }, []);

    // Construction unique de la menubar native (shell Tauri uniquement).
    useEffect(() => {
        if (!isTauriRuntime()) return;
        let disposed = false;
        void buildAppMenu(settingsRef.current, () => actionsRef.current!).then((built) => {
            if (disposed) return;
            itemsRef.current = built.items;
            // Réaligne les états : réglages et brouillon ont pu bouger pendant
            // la construction asynchrone.
            syncMenu();
        });
        return () => {
            disposed = true;
        };
    }, [syncMenu]);

    // Coches, activations et libellés réalignés à chaque changement d'état :
    // le menu, la boîte de paramètres et le bouton de thème restent synchrones.
    useEffect(() => {
        syncMenu();
    }, [syncMenu, mode, colorTheme, hud, animations, isHome, isImport, canUndo, canRedo]);

    // Demandes de fermeture natives (traffic lights macOS, Alt+F4, croix
    // Windows/Linux) : interception et confirmation de sortie, comme ⌘W
    // sur l'accueil. L'application ne se ferme que par confirmQuit.
    useEffect(() => {
        if (!isTauriRuntime()) return;
        const unlisten = getCurrentWindow().onCloseRequested((event) => {
            event.preventDefault();
            actionsRef.current?.quit();
        });
        return () => {
            void unlisten.then((dispose) => dispose());
        };
    }, []);

    return (
        <>
            <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>À propos d'Eventages QrCode Studio</DialogTitle>
                        <DialogDescription>
                            Studio de création de codes QR : URL, Wi-Fi, contact,
                            code-barres et plus.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                        <p className="leading-relaxed text-muted-foreground">
                            Eventages QrCode Studio conçoit, habille et exporte des codes
                            QR, en entier hors ligne — aucun compte, aucun
                            serveur : vos projets restent sur votre machine.
                        </p>
                        <p className="font-mono text-xs tracking-wider text-muted-foreground/80">
                            VERSION {APP_VERSION} · TAURI + REACT
                        </p>
                    </div>
                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline"/>}>
                            Fermer
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sortie confirmée : alerte renforcée si le projet est modifié. */}
            <Dialog
                open={quitDialog !== null}
                onOpenChange={(open) => {
                    if (!open) setQuitDialog(null);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    {quitDialog === "unsaved" ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>Projet non enregistré</DialogTitle>
                                <DialogDescription>
                                    « {state.projectName} » contient des
                                    modifications non enregistrées. Voulez-vous
                                    l'enregistrer avant de quitter ?
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex-wrap">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => void confirmQuit(false)}
                                >
                                    Quitter sans enregistrer
                                </Button>
                                <DialogClose render={<Button type="button" variant="outline"/>}>
                                    Annuler
                                </DialogClose>
                                <Button type="button" onClick={() => void confirmQuit(true)}>
                                    Enregistrer et quitter
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle>Quitter Eventages QrCode Studio ?</DialogTitle>
                                <DialogDescription>
                                    L'application va être fermée. Voulez-vous
                                    continuer ?
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <DialogClose render={<Button type="button" variant="outline"/>}>
                                    Annuler
                                </DialogClose>
                                <Button type="button" onClick={() => void confirmQuit(false)}>
                                    Quitter
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

/**
 * Construit la menubar complète et l'installe comme menu d'application.
 * Les items à état (coches, actions de brouillon) sont créés explicitement
 * pour garder l'instance côté front ; le reste passe par des descripteurs.
 */
async function buildAppMenu(
    state: MenuSettings,
    getActions: () => MenuActions,
): Promise<{menu: Menu; items: MenuItems}> {
    const os = detectOS();
    const isMac = os === "macos";
    const isLinux = os === "linux";

    /**
     * Action d'un item cochable : applique le réglage puis réaffiche l'état
     * réel — le natif bascule la case de lui-même, y compris quand on
     * reclique sur l'entrée déjà cochée (faux décochage à corriger).
     */
    const check = (apply: (actions: MenuActions) => void) => () => {
        const actions = getActions();
        apply(actions);
        actions.syncChecks();
    };

    // — Fichier : cycle de vie du projet. Les raccourcis ⌘N/⌘O/⌘I/⌘S/⌘⇧S/⇧⌘E
    //   deviennent des accélérateurs natifs (plus aucun écouteur JS côté
    //   webview) ; « Fermer » suit la convention des menus système : dans
    //   Fichier, après le groupe d'ouverture.
    const newProjectItem = await MenuItem.new({
        id: "file:new",
        text: "Nouveau projet",
        accelerator: "CmdOrCtrl+N",
        action: () => getActions().newProject(),
    });
    const openItem = await MenuItem.new({
        id: "file:open",
        text: "Ouvrir un fichier projet…",
        accelerator: "CmdOrCtrl+O",
        action: () => getActions().openQcp(),
    });
    const importItem = await MenuItem.new({
        id: "file:import",
        text: "Importer un QR existant…",
        accelerator: "CmdOrCtrl+I",
        action: () => getActions().importQr(),
    });
    // Fermer (⌘W) : item réel — ferme l'onglet courant, ou déclenche la
    // sortie confirmée sur l'onglet Accueil (voir closeTab). Le rôle natif
    // CloseWindow fermerait la fenêtre sans confirmation.
    const closeItem = await MenuItem.new({
        id: "file:close",
        text: state.isHome ? "Fermer Eventages QrCode Studio" : "Fermer l'onglet",
        accelerator: "CmdOrCtrl+W",
        action: () => getActions().closeTab(),
    });
    const saveItem = await MenuItem.new({
        id: "file:save",
        text: "Enregistrer",
        accelerator: "CmdOrCtrl+S",
        enabled: !state.isHome,
        action: () => getActions().save(),
    });
    const saveAsItem = await MenuItem.new({
        id: "file:save-as",
        text: "Enregistrer sous…",
        accelerator: "CmdOrCtrl+Shift+S",
        enabled: !state.isHome,
        action: () => getActions().saveAs(),
    });
    // Export ouvre le module dédié (formats, résolution, presse-papiers,
    // partage, projet .qrd) : libellé neutre + accélération d'usage ⇧⌘E.
    const exportItem = await MenuItem.new({
        id: "file:export",
        text: "Exporter…",
        accelerator: "CmdOrCtrl+Shift+E",
        enabled: !state.isHome,
        action: () => getActions().exportImage(),
    });
    const fileItems: ItemSpec[] = [
        newProjectItem,
        openItem,
        importItem,
        {item: "Separator"},
        closeItem,
        saveItem,
        saveAsItem,
        {item: "Separator"},
        exportItem,
    ];
    // Quitter : item réel routé vers la confirmation de sortie (le rôle
    // natif « Quit » est inopérant sous Linux et sans accélérateur ailleurs).
    if (!isMac) {
        fileItems.push(
            {item: "Separator"},
            await MenuItem.new({
                id: "file:quit",
                text: "Quitter Eventages QrCode Studio",
                accelerator: "CmdOrCtrl+Q",
                action: () => getActions().quit(),
            }),
        );
    }
    const fileSubmenu = await Submenu.new({text: "Fichier", items: fileItems});

    // — Édition : Annuler/Rétablir branchés sur l'historique applicatif du
    //   brouillon (les rôles natifs Undo/Redo ne savent annuler que la saisie
    //   webview, pas les changements de projet) — items réels, donc
    //   opérationnels aussi sous Linux ; puis rôles natifs du presse-papiers
    //   (⌘X/⌘C/⌘V/⌘A). Activation réalignée par le front (syncMenu).
    const undoItem = await MenuItem.new({
        id: "edit:undo",
        text: "Annuler",
        accelerator: "CmdOrCtrl+Z",
        enabled: false,
        action: () => getActions().undo(),
    });
    const redoItem = await MenuItem.new({
        id: "edit:redo",
        text: "Rétablir",
        accelerator: "CmdOrCtrl+Shift+Z",
        enabled: false,
        action: () => getActions().redo(),
    });
    const editItems: ItemSpec[] = [
        undoItem,
        redoItem,
        {item: "Separator"},
        {item: "Cut", text: "Couper"},
        {item: "Copy", text: "Copier"},
        {item: "Paste", text: "Coller"},
        {item: "SelectAll", text: "Tout sélectionner"},
    ];
    const editSubmenu = await Submenu.new({text: "Édition", items: editItems});

    // — Affichage : mode (paire de coches exclusives), thèmes de couleurs
    //   (sous-menu), ornements HUD et animations.
    const [modeLight, modeDark, hudItem, animationsItem] = await Promise.all([
        CheckMenuItem.new({
            id: "view:mode-light",
            text: "Thème clair",
            checked: state.mode === "light",
            action: check((actions) => actions.setMode("light")),
        }),
        CheckMenuItem.new({
            id: "view:mode-dark",
            text: "Thème sombre",
            checked: state.mode === "dark",
            action: check((actions) => actions.setMode("dark")),
        }),
        CheckMenuItem.new({
            id: "view:hud",
            text: "Ornements HUD",
            checked: state.hud,
            action: check((actions) => actions.toggleHud()),
        }),
        CheckMenuItem.new({
            id: "view:animations",
            text: "Animations",
            checked: state.animations,
            action: check((actions) => actions.toggleAnimations()),
        }),
    ]);
    const themes = await Promise.all(COLOR_THEMES.map((theme) => CheckMenuItem.new({
        id: `view:theme-${theme.id}`,
        text: theme.label,
        checked: state.colorTheme === theme.id,
        action: check((actions) => actions.setColorTheme(theme.id)),
    })));
    const colorsSubmenu = await Submenu.new({text: "Thème de couleurs", items: themes});
    const viewSubmenu = await Submenu.new({
        text: "Affichage",
        items: [
            modeLight,
            modeDark,
            {item: "Separator"},
            colorsSubmenu,
            {item: "Separator"},
            hudItem,
            animationsItem,
        ],
    });

    // — Fenêtre : classement natif de la fenêtre. Sous Linux, les rôles
    //   Réduire/Agrandir sont inopérants (GTK) : items réels branchés sur
    //   l'API fenêtre. macOS ajoute « Zoom » et le classement « toutes au
    //   premier plan » de la convention système.
    const windowItems: ItemSpec[] = isLinux
        ? [
            await MenuItem.new({
                id: "window:minimize",
                text: "Réduire",
                action: () => void getCurrentWindow().minimize(),
            }),
            await MenuItem.new({
                id: "window:maximize",
                text: "Agrandir ou restaurer",
                action: () => void getCurrentWindow().toggleMaximize(),
            }),
        ]
        : isMac
            ? [
                {item: "Minimize", text: "Réduire"},
                {item: "Maximize", text: "Zoom"},
                {item: "Separator"},
                {item: "BringAllToFront", text: "Placer toutes les fenêtres au premier plan"},
            ]
            : [
                {item: "Minimize", text: "Réduire"},
                {item: "Maximize", text: "Agrandir"},
            ];
    const windowSubmenu = await Submenu.new({text: "Fenêtre", items: windowItems});

    // — Aide : à propos (ouvre le dialog de l'application).
    const aboutHelpItem = await MenuItem.new({
        id: "help:about",
        text: "À propos d'Eventages QrCode Studio",
        action: () => getActions().about(),
    });
    const helpSubmenu = await Submenu.new({text: "Aide", items: [aboutHelpItem]});

    // — macOS : le premier sous-menu devient le menu applicatif (titre
    //   remplacé par le nom de l'app) ; la convention le veut en tête.
    const submenus: Submenu[] = [];
    if (isMac) {
        const aboutAppItem = await MenuItem.new({
            id: "app:about",
            text: "À propos d'Eventages QrCode Studio",
            action: () => getActions().about(),
        });
        submenus.push(await Submenu.new({
            text: "Eventages QrCode Studio",
            items: [
                aboutAppItem,
                {item: "Separator"},
                {item: "Hide", text: "Masquer Eventages QrCode Studio"},
                {item: "HideOthers", text: "Masquer les autres"},
                {item: "ShowAll", text: "Tout afficher"},
                {item: "Separator"},
                // Item réel plutôt que rôle Quit : ⌘Q passe par la
                // confirmation de sortie (alerte renforcée si le projet
                // n'est pas enregistré).
                await MenuItem.new({
                    id: "app:quit",
                    text: "Quitter Eventages QrCode Studio",
                    accelerator: "CmdOrCtrl+Q",
                    action: () => getActions().quit(),
                }),
            ],
        }));
    }
    submenus.push(fileSubmenu, editSubmenu, viewSubmenu, windowSubmenu, helpSubmenu);

    const menu = await Menu.new({id: "app-menu", items: submenus});
    await menu.setAsAppMenu();
    return {
        menu,
        items: {
            modeLight,
            modeDark,
            themes,
            hud: hudItem,
            animations: animationsItem,
            draft: [saveItem, saveAsItem, exportItem],
            undo: undoItem,
            redo: redoItem,
            close: closeItem,
        },
    };
}

/** Réaligne les coches des items natifs sur les réglages courants. */
function syncChecks(items: MenuItems, settings: MenuSettings): void {
    void items.modeLight.setChecked(settings.mode === "light");
    void items.modeDark.setChecked(settings.mode === "dark");
    for (const [index, theme] of COLOR_THEMES.entries()) {
        void items.themes[index]?.setChecked(settings.colorTheme === theme.id);
    }
    void items.hud.setChecked(settings.hud);
    void items.animations.setChecked(settings.animations);
}

/**
 * Signale une erreur de dialogue natif : fenêtre de message système sous
 * Tauri (permission dialog:default), simple alerte navigateur sinon.
 */
async function reportError(title: string, cause: unknown, fallback: string) {
    const detail = describeError(cause, fallback);
    if (isTauriRuntime()) {
        await message(detail, {title, kind: "error"});
    } else {
        window.alert(`${title}\n\n${detail}`);
    }
}
