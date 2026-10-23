//! Messages lisibles renvoyés au webview (échecs de commandes, état du CLI),
//! traduits dans la langue de l'interface choisie dans les paramètres.
//! L'I18nProvider (frontend) pose la langue au démarrage puis à chaque
//! changement, via la commande `set_ui_locale` — le catalogue suit sans
//! toucher aux signatures des commandes. L'anglais fait foi et sert de repli
//! clé par clé (même principe que `src/lib/i18n/dictionaries/`), et les
//! marqueurs `{nom}` sont substitués à la volée. Les messages du système
//! (io::Error…) restent dans la langue de la machine : ils sont insérés
//! tels quels dans les gabarits.

use std::sync::RwLock;

/// Langue de l'interface courante (identifiant court, ex. « fr ») ; vide
/// jusqu'à ce que le webview la pose — les messages retombent alors en anglais.
static UI_LOCALE: RwLock<String> = RwLock::new(String::new());

/// Catalogue : une clé, puis le texte par langue. « en » figure toujours en
/// dernier : c'est le repli quand la langue courante ne fournit pas la clé.
const ENTRIES: &[(&str, &[(&str, &str)])] = &[
    (
        "cmd.save.interrupted",
        &[
            ("fr", "Enregistrement interrompu : {error}"),
            ("es", "El guardado se interrumpió: {error}"),
            ("de", "Speichern unterbrochen: {error}"),
            ("it", "Salvataggio interrotto: {error}"),
            ("pt", "O salvamento foi interrompido: {error}"),
            ("nl", "Opslaan onderbroken: {error}"),
            ("ru", "Сохранение прервано: {error}"),
            ("ja", "保存が中断されました: {error}"),
            ("zh", "保存已中断：{error}"),
            ("ar", "توقف الحفظ: {error}"),
            ("en", "Saving interrupted: {error}"),
        ],
    ),
    (
        "cmd.open.interrupted",
        &[
            ("fr", "Ouverture interrompue : {error}"),
            ("es", "La apertura se interrumpió: {error}"),
            ("de", "Öffnen unterbrochen: {error}"),
            ("it", "Apertura interrotta: {error}"),
            ("pt", "A abertura foi interrompida: {error}"),
            ("nl", "Openen onderbroken: {error}"),
            ("ru", "Открытие прервано: {error}"),
            ("ja", "読み込みが中断されました: {error}"),
            ("zh", "打开已中断：{error}"),
            ("ar", "توقف الفتح: {error}"),
            ("en", "Opening interrupted: {error}"),
        ],
    ),
    (
        "cmd.import.interrupted",
        &[
            ("fr", "Import interrompu : {error}"),
            ("es", "La importación se interrumpió: {error}"),
            ("de", "Import unterbrochen: {error}"),
            ("it", "Importazione interrotta: {error}"),
            ("pt", "A importação foi interrompida: {error}"),
            ("nl", "Import onderbroken: {error}"),
            ("ru", "Импорт прерван: {error}"),
            ("ja", "インポートが中断されました: {error}"),
            ("zh", "导入已中断：{error}"),
            ("ar", "توقف الاستيراد: {error}"),
            ("en", "Import interrupted: {error}"),
        ],
    ),
    (
        "cmd.export.interrupted",
        &[
            ("fr", "Export interrompu : {error}"),
            ("es", "La exportación se interrumpió: {error}"),
            ("de", "Export unterbrochen: {error}"),
            ("it", "Esportazione interrotta: {error}"),
            ("pt", "A exportação foi interrompida: {error}"),
            ("nl", "Export onderbroken: {error}"),
            ("ru", "Экспорт прерван: {error}"),
            ("ja", "エクスポートが中断されました: {error}"),
            ("zh", "导出已中断：{error}"),
            ("ar", "توقف التصدير: {error}"),
            ("en", "Export interrupted: {error}"),
        ],
    ),
    (
        "cli.status.unsupported",
        &[
            (
                "fr",
                "La mise à disposition du CLI n'est pas prise en charge sur ce système.",
            ),
            (
                "es",
                "La exposición del CLI no es compatible con este sistema.",
            ),
            (
                "de",
                "Die CLI-Bereitstellung wird auf diesem System nicht unterstützt.",
            ),
            (
                "it",
                "La messa a disposizione del CLI non è supportata su questo sistema.",
            ),
            (
                "pt",
                "A disponibilização do CLI não é suportada neste sistema.",
            ),
            (
                "nl",
                "Het CLI beschikbaar maken wordt op dit systeem niet ondersteund.",
            ),
            ("ru", "Предоставление CLI не поддерживается в этой системе."),
            ("ja", "このシステムでは CLI の公開に対応していません。"),
            ("zh", "此系统不支持提供 CLI 命令。"),
            ("ar", "توفير أوامر CLI غير مدعوم على هذا النظام."),
            ("en", "CLI exposure is not supported on this system."),
        ],
    ),
    (
        "cli.status.scriptMissingInstalled",
        &[
            (
                "fr",
                "Commandes posées, mais le script source est introuvable : lancez l'app depuis le dépôt du projet.",
            ),
            (
                "es",
                "Comandos instalados, pero no se encuentra el script de origen: lanza la app desde el repositorio del proyecto.",
            ),
            (
                "de",
                "Befehle sind installiert, aber das Quellskript fehlt: Starte die App aus dem Projektarchiv.",
            ),
            (
                "it",
                "Comandi installati, ma lo script di origine è assente: avvia l'app dal repository del progetto.",
            ),
            (
                "pt",
                "Comandos instalados, mas o script de origem não foi encontrado: inicie o app a partir do repositório do projeto.",
            ),
            (
                "nl",
                "Opdrachten geplaatst, maar het bronscript ontbreekt: start de app vanuit de projectrepository.",
            ),
            (
                "ru",
                "Команды установлены, но исходный скрипт не найден: запустите приложение из репозитория проекта.",
            ),
            (
                "ja",
                "コマンドはインストール済みですが、ソーススクリプトが見つかりません: プロジェクトのリポジトリからアプリを起動してください。",
            ),
            ("zh", "命令已安装，但找不到源脚本：请从项目仓库启动应用。"),
            (
                "ar",
                "الأوامر منصوبة، لكن نص المصدر غير موجود: شغّل التطبيق من مستودع المشروع.",
            ),
            (
                "en",
                "Commands installed, but the source script is missing: run the app from the project repository.",
            ),
        ],
    ),
    (
        "cli.status.unavailable",
        &[
            (
                "fr",
                "CLI indisponible : lancez l'app depuis le dépôt du projet pour installer les commandes.",
            ),
            (
                "es",
                "CLI no disponible: lanza la app desde el repositorio del proyecto para instalar los comandos.",
            ),
            (
                "de",
                "CLI nicht verfügbar: Starte die App aus dem Projektarchiv, um die Befehle zu installieren.",
            ),
            (
                "it",
                "CLI non disponibile: avvia l'app dal repository del progetto per installare i comandi.",
            ),
            (
                "pt",
                "CLI indisponível: inicie o app a partir do repositório do projeto para instalar os comandos.",
            ),
            (
                "nl",
                "CLI niet beschikbaar: start de app vanuit de projectrepository om de opdrachten te installeren.",
            ),
            (
                "ru",
                "CLI недоступен: запустите приложение из репозитория проекта, чтобы установить команды.",
            ),
            (
                "ja",
                "CLI を利用できません: コマンドをインストールするには、プロジェクトのリポジトリからアプリを起動してください。",
            ),
            ("zh", "CLI 不可用：请从项目仓库启动应用以安装命令。"),
            (
                "ar",
                "CLI غير متاح: شغّل التطبيق من مستودع المشروع لتثبيت الأوامر.",
            ),
            (
                "en",
                "CLI unavailable: run the app from the project repository to install the commands.",
            ),
        ],
    ),
    (
        "cli.status.installed",
        &[
            ("fr", "Commandes disponibles dans {binDir} : {commands}"),
            ("es", "Comandos disponibles en {binDir}: {commands}"),
            ("de", "Befehle verfügbar in {binDir}: {commands}"),
            ("it", "Comandi disponibili in {binDir}: {commands}"),
            ("pt", "Comandos disponíveis em {binDir}: {commands}"),
            ("nl", "Opdrachten beschikbaar in {binDir}: {commands}"),
            ("ru", "Команды доступны в {binDir}: {commands}"),
            ("ja", "{binDir} にコマンドが用意されています: {commands}"),
            ("zh", "命令已就位于 {binDir}：{commands}"),
            ("ar", "الأوامر متاحة في {binDir}: {commands}"),
            ("en", "Commands available in {binDir}: {commands}"),
        ],
    ),
    (
        "cli.status.notInstalled",
        &[
            (
                "fr",
                "Commandes absentes du PATH : activez la disponibilité pour les installer.",
            ),
            (
                "es",
                "Comandos ausentes del PATH: activa la exposición para instalarlos.",
            ),
            (
                "de",
                "Befehle fehlen im PATH: Aktiviere die Bereitstellung, um sie zu installieren.",
            ),
            (
                "it",
                "Comandi assenti dal PATH: attiva la disponibilità per installarli.",
            ),
            (
                "pt",
                "Comandos ausentes do PATH: ative a disponibilização para instalá-los.",
            ),
            (
                "nl",
                "Opdrachten ontbreken in de PATH: activeer beschikbaarheid om ze te installeren.",
            ),
            (
                "ru",
                "Команды отсутствуют в PATH: включите доступность, чтобы установить их.",
            ),
            (
                "ja",
                "PATH にコマンドがありません: 公開を有効にしてインストールしてください。",
            ),
            ("zh", "PATH 中没有这些命令：请启用提供功能进行安装。"),
            ("ar", "الأوامر غير موجودة في PATH: فعّل التوفير لتثبيتها."),
            (
                "en",
                "Commands missing from the PATH: enable exposure to install them.",
            ),
        ],
    ),
    (
        "cli.install.scriptMissing",
        &[
            (
                "fr",
                "Script CLI introuvable : lancez l'app depuis le dépôt du projet.",
            ),
            (
                "es",
                "Script del CLI no encontrado: lanza la app desde el repositorio del proyecto.",
            ),
            (
                "de",
                "CLI-Skript nicht gefunden: Starte die App aus dem Projektarchiv.",
            ),
            (
                "it",
                "Script CLI introvabile: avvia l'app dal repository del progetto.",
            ),
            (
                "pt",
                "Script do CLI não encontrado: inicie o app a partir do repositório do projeto.",
            ),
            (
                "nl",
                "CLI-script niet gevonden: start de app vanuit de projectrepository.",
            ),
            (
                "ru",
                "Скрипт CLI не найден: запустите приложение из репозитория проекта.",
            ),
            (
                "ja",
                "CLI スクリプトが見つかりません: プロジェクトのリポジトリからアプリを起動してください。",
            ),
            ("zh", "找不到 CLI 脚本：请从项目仓库启动应用。"),
            ("ar", "نص CLI غير موجود: شغّل التطبيق من مستودع المشروع."),
            (
                "en",
                "CLI script not found: run the app from the project repository.",
            ),
        ],
    ),
    (
        "cli.link.notALink",
        &[
            (
                "fr",
                "« {path} » existe déjà et n'est pas un lien : laissez-le en place.",
            ),
            (
                "es",
                "«{path}» ya existe y no es un enlace: déjalo como está.",
            ),
            (
                "de",
                "„{path}“ existiert bereits und ist kein Link: Lass ihn, wie er ist.",
            ),
            (
                "it",
                "«{path}» esiste già e non è un collegamento: lascialo com'è.",
            ),
            (
                "pt",
                "«{path}» já existe e não é um link simbólico: deixe-o como está.",
            ),
            (
                "nl",
                "«{path}» bestaat al en is geen koppeling: laat het zoals het is.",
            ),
            (
                "ru",
                "«{path}» уже существует и не является ссылкой: оставьте как есть.",
            ),
            (
                "ja",
                "「{path}」は既に存在し、リンクではありません: そのまま残してください。",
            ),
            ("zh", "「{path}」已存在且不是链接：请保持原样。"),
            ("ar", "«{path}» موجود بالفعل وليس رابطًا: اتركه مكانه."),
            (
                "en",
                "“{path}” already exists and is not a link: leave it in place.",
            ),
        ],
    ),
    (
        "export.badBase64",
        &[
            ("fr", "Fichier illisible : base64 invalide."),
            ("es", "Archivo ilegible: base64 no válido."),
            ("de", "Datei unlesbar: ungültiges Base64."),
            ("it", "File illeggibile: base64 non valido."),
            ("pt", "Arquivo ilegível: base64 inválido."),
            ("nl", "Bestand onleesbaar: ongeldige base64."),
            ("ru", "Нечитаемый файл: недопустимый base64."),
            ("ja", "ファイルを読み取れません: base64 が不正です。"),
            ("zh", "文件无法读取：base64 无效。"),
            ("ar", "ملف غير قابل للقراءة: base64 غير صالح."),
            ("en", "Unreadable file: invalid base64."),
        ],
    ),
    (
        "export.empty",
        &[
            ("fr", "Export vide : le rendu a échoué."),
            ("es", "Exportación vacía: la renderización falló."),
            ("de", "Leerer Export: das Rendern ist fehlgeschlagen."),
            ("it", "Esportazione vuota: il rendering è fallito."),
            ("pt", "Exportação vazia: a renderização falhou."),
            ("nl", "Lege export: het renderen is mislukt."),
            ("ru", "Пустой экспорт: рендер не удался."),
            ("ja", "エクスポートが空です: 描画に失敗しました。"),
            ("zh", "导出为空：渲染失败。"),
            ("ar", "تصدير فارغ: فشل التصيير."),
            ("en", "Empty export: the render failed."),
        ],
    ),
    (
        "share.badBase64",
        &[
            ("fr", "Image illisible : base64 invalide."),
            ("es", "Imagen ilegible: base64 no válido."),
            ("de", "Bild unlesbar: ungültiges Base64."),
            ("it", "Immagine illeggibile: base64 non valido."),
            ("pt", "Imagem ilegível: base64 inválido."),
            ("nl", "Afbeelding onleesbaar: ongeldige base64."),
            ("ru", "Нечитаемое изображение: недопустимый base64."),
            ("ja", "画像を読み取れません: base64 が不正です。"),
            ("zh", "图像无法读取：base64 无效。"),
            ("ar", "صورة غير قابلة للقراءة: base64 غير صالح."),
            ("en", "Unreadable image: invalid base64."),
        ],
    ),
    (
        "share.empty",
        &[
            ("fr", "Image vide : le rendu a échoué."),
            ("es", "Imagen vacía: la renderización falló."),
            ("de", "Leeres Bild: das Rendern ist fehlgeschlagen."),
            ("it", "Immagine vuota: il rendering è fallito."),
            ("pt", "Imagem vazia: a renderização falhou."),
            ("nl", "Lege afbeelding: het renderen is mislukt."),
            ("ru", "Пустое изображение: рендер не удался."),
            ("ja", "画像が空です: 描画に失敗しました。"),
            ("zh", "图像为空：渲染失败。"),
            ("ar", "صورة فارغة: فشل التصيير."),
            ("en", "Empty image: the render failed."),
        ],
    ),
    (
        "share.windowMissing",
        &[
            ("fr", "Fenêtre native introuvable."),
            ("es", "Ventana nativa no encontrada."),
            ("de", "Nativer Fenster nicht gefunden."),
            ("it", "Finestra nativa introvabile."),
            ("pt", "Janela nativa não encontrada."),
            ("nl", "Natief venster niet gevonden."),
            ("ru", "Собственное окно не найдено."),
            ("ja", "ネイティブウィンドウが見つかりません。"),
            ("zh", "找不到原生窗口。"),
            ("ar", "النافذة الأصلية غير موجودة."),
            ("en", "Native window not found."),
        ],
    ),
    (
        "share.contentViewMissing",
        &[
            ("fr", "Vue de la fenêtre introuvable."),
            ("es", "Vista de contenido de la ventana no encontrada."),
            ("de", "Inhaltsansicht des Fensters nicht gefunden."),
            ("it", "Vista dei contenuti della finestra introvabile."),
            ("pt", "Visualização de conteúdo da janela não encontrada."),
            ("nl", "Inhoudsweergave van het venster niet gevonden."),
            ("ru", "Представление содержимого окна не найдено."),
            ("ja", "ウィンドウのコンテンツビューが見つかりません。"),
            ("zh", "找不到窗口内容视图。"),
            ("ar", "عرض محتوى النافذة غير موجود."),
            ("en", "Window content view not found."),
        ],
    ),
    (
        "import.readFailed",
        &[
            ("fr", "Lecture du fichier impossible : {error}"),
            ("es", "No se pudo leer el archivo: {error}"),
            ("de", "Datei konnte nicht gelesen werden: {error}"),
            ("it", "Impossibile leggere il file: {error}"),
            ("pt", "Não foi possível ler o arquivo: {error}"),
            ("nl", "Bestand kon niet worden gelezen: {error}"),
            ("ru", "Не удалось прочитать файл: {error}"),
            ("ja", "ファイルを読み取れませんでした: {error}"),
            ("zh", "无法读取文件：{error}"),
            ("ar", "تعذرت قراءة الملف: {error}"),
            ("en", "Could not read the file: {error}"),
        ],
    ),
    (
        "import.emptyFile",
        &[
            ("fr", "Fichier vide : aucun code lisible à décoder."),
            (
                "es",
                "Archivo vacío: ningún código legible que decodificar.",
            ),
            ("de", "Leere Datei: kein lesbarer Code zum Dekodieren."),
            ("it", "File vuoto: nessun codice leggibile da decodificare."),
            (
                "pt",
                "Arquivo vazio: nenhum código legível para decodificar.",
            ),
            ("nl", "Leeg bestand: geen leesbare code te decoderen."),
            ("ru", "Файл пуст: нет читаемого кода для декодирования."),
            ("ja", "空のファイル: 読み取れるコードがありません。"),
            ("zh", "文件为空：没有可读取的代码供解码。"),
            ("ar", "ملف فارغ: لا رمز قابل للقراءة لفك ترميزه."),
            ("en", "Empty file: no readable code to decode."),
        ],
    ),
    (
        "import.noCodeFound",
        &[
            (
                "fr",
                "Aucun QR code ou code-barres détecté. Vérifiez que le code est net, non rogné et suffisamment grand.",
            ),
            (
                "es",
                "No se detectó ningún código QR ni código de barras. Asegúrate de que el código sea nítido, no recortado y suficientemente grande.",
            ),
            (
                "de",
                "Kein QR-Code oder Strichcode erkannt. Prüfe, dass der Code scharf, nicht beschnitten und groß genug ist.",
            ),
            (
                "it",
                "Nessun codice QR o codice a barre rilevato. Verifica che il codice sia nitido, non ritagliato e abbastanza grande.",
            ),
            (
                "pt",
                "Nenhum código QR ou código de barras detectado. Verifique se o código está nítido, sem recortes e grande o suficiente.",
            ),
            (
                "nl",
                "Geen QR-code of streepjescode gedetecteerd. Zorg dat de code scherp, niet bijgesneden en groot genoeg is.",
            ),
            (
                "ru",
                "QR-код или штрихкод не обнаружены. Убедитесь, что код чёткий, не обрезан и достаточно крупный.",
            ),
            (
                "ja",
                "QR コードやバーコードが検出されませんでした。コードが鮮明で、切り取られておらず、十分な大きさか確認してください。",
            ),
            (
                "zh",
                "未检测到二维码或条形码。请确认代码清晰、未被裁剪且足够大。",
            ),
            (
                "ar",
                "لم يُكتشف أي رمز QR أو رمز شريطي. تأكد من أن الرمز حاد، غير مقصوص، ويكفي حجمه.",
            ),
            (
                "en",
                "No QR code or barcode detected. Make sure the code is sharp, uncropped and large enough.",
            ),
        ],
    ),
    (
        "import.pdfNoCode",
        &[
            (
                "fr",
                "Aucun QR code ou code-barres détecté dans les images de ce PDF.",
            ),
            (
                "es",
                "No se detectó ningún código QR ni código de barras en las imágenes de este PDF.",
            ),
            (
                "de",
                "Kein QR-Code oder Strichcode in den Bildern dieses PDFs erkannt.",
            ),
            (
                "it",
                "Nessun codice QR o codice a barre rilevato nelle immagini di questo PDF.",
            ),
            (
                "pt",
                "Nenhum código QR ou código de barras detectado nas imagens deste PDF.",
            ),
            (
                "nl",
                "Geen QR-code of streepjescode gedetecteerd in de afbeeldingen van deze PDF.",
            ),
            (
                "ru",
                "QR-код или штрихкод не обнаружены на изображениях этого PDF.",
            ),
            (
                "ja",
                "この PDF の画像から QR コードやバーコードは検出されませんでした。",
            ),
            ("zh", "在此 PDF 的图像中未检测到二维码或条形码。"),
            ("ar", "لم يُكتشف أي رمز QR أو رمز شريطي في صور هذا PDF."),
            (
                "en",
                "No QR code or barcode detected in the images of this PDF.",
            ),
        ],
    ),
    (
        "qcp.save.badAssetPath",
        &[
            ("fr", "Chemin d'actif invalide : {raw}"),
            ("es", "Ruta de recurso no válida: {raw}"),
            ("de", "Ungültiger Asset-Pfad: {raw}"),
            ("it", "Percorso dell'asset non valido: {raw}"),
            ("pt", "Caminho de recurso inválido: {raw}"),
            ("nl", "Ongeldig resourcepad: {raw}"),
            ("ru", "Недопустимый путь ресурса: {raw}"),
            ("ja", "アセットのパスが不正です: {raw}"),
            ("zh", "资源路径无效：{raw}"),
            ("ar", "مسار المورد غير صالح: {raw}"),
            ("en", "Invalid asset path: {raw}"),
        ],
    ),
    (
        "qcp.save.manifestInvalid",
        &[
            ("fr", "Manifeste du projet invalide (JSON illisible)."),
            ("es", "Manifiesto del proyecto no válido (JSON ilegible)."),
            ("de", "Projektmanifest ungültig (unlesbares JSON)."),
            (
                "it",
                "Manifesto del progetto non valido (JSON illeggibile).",
            ),
            ("pt", "Manifesto do projeto inválido (JSON ilegível)."),
            ("nl", "Projectmanifest ongeldig (onleesbare JSON)."),
            ("ru", "Недопустимый манифест проекта (JSON нечитаем)."),
            (
                "ja",
                "プロジェクトのマニフェストが不正です（JSON を読み取れません）。",
            ),
            ("zh", "项目清单无效（JSON 无法读取）。"),
            ("ar", "بيان المشروع غير صالح (JSON غير قابل للقراءة)."),
            ("en", "Invalid project manifest (unreadable JSON)."),
        ],
    ),
    (
        "qcp.save.tooManyAssets",
        &[
            (
                "fr",
                "Trop de fichiers média ({count}) : la limite est de {max}.",
            ),
            (
                "es",
                "Demasiados archivos multimedia ({count}): el límite es {max}.",
            ),
            (
                "de",
                "Zu viele Mediendateien ({count}): das Limit ist {max}.",
            ),
            (
                "it",
                "Troppi file multimediali ({count}): il limite è {max}.",
            ),
            (
                "pt",
                "Arquivos de mídia demais ({count}): o limite é {max}.",
            ),
            (
                "nl",
                "Te veel mediabestanden ({count}): de limiet is {max}.",
            ),
            ("ru", "Слишком много медиафайлов ({count}): предел — {max}."),
            (
                "ja",
                "メディアファイルが多すぎます（{count}）: 上限は {max} です。",
            ),
            ("zh", "媒体文件过多（{count}）：上限为 {max}。"),
            ("ar", "ملفات وسائط كثيرة جدًا ({count}): الحد {max}."),
            ("en", "Too many media files ({count}): the limit is {max}."),
        ],
    ),
    (
        "qcp.save.createFailed",
        &[
            ("fr", "Création du fichier projet impossible : {error}"),
            ("es", "No se pudo crear el archivo del proyecto: {error}"),
            ("de", "Projektdatei konnte nicht erstellt werden: {error}"),
            ("it", "Impossibile creare il file di progetto: {error}"),
            ("pt", "Não foi possível criar o arquivo do projeto: {error}"),
            ("nl", "Projectbestand kon niet worden aangemaakt: {error}"),
            ("ru", "Не удалось создать файл проекта: {error}"),
            ("ja", "プロジェクトファイルを作成できませんでした: {error}"),
            ("zh", "无法创建项目文件：{error}"),
            ("ar", "تعذر إنشاء ملف المشروع: {error}"),
            ("en", "Could not create the project file: {error}"),
        ],
    ),
    (
        "qcp.save.writeFailed",
        &[
            ("fr", "Écriture de l'archive impossible : {error}"),
            ("es", "No se pudo escribir el paquete: {error}"),
            ("de", "Archiv konnte nicht geschrieben werden: {error}"),
            ("it", "Impossibile scrivere l'archivio: {error}"),
            ("pt", "Não foi possível gravar o pacote: {error}"),
            ("nl", "Archief kon niet worden geschreven: {error}"),
            ("ru", "Не удалось записать архив: {error}"),
            ("ja", "書庫を書き込めませんでした: {error}"),
            ("zh", "无法写入归档：{error}"),
            ("ar", "تعذرت كتابة الأرشيف: {error}"),
            ("en", "Could not write the archive: {error}"),
        ],
    ),
    (
        "qcp.save.assetUnreadableB64",
        &[
            ("fr", "Fichier média illisible (base64 invalide) : {path}"),
            (
                "es",
                "Archivo multimedia ilegible (base64 no válido): {path}",
            ),
            ("de", "Mediendatei unlesbar (ungültiges Base64): {path}"),
            (
                "it",
                "File multimediale illeggibile (base64 non valido): {path}",
            ),
            ("pt", "Arquivo de mídia ilegível (base64 inválido): {path}"),
            ("nl", "Mediabestand onleesbaar (ongeldige base64): {path}"),
            ("ru", "Нечитаемый медиафайл (недопустимый base64): {path}"),
            (
                "ja",
                "メディアファイルを読み取れません（base64 が不正）: {path}",
            ),
            ("zh", "媒体文件无法读取（base64 无效）：{path}"),
            ("ar", "ملف وسائط غير قابل للقراءة (base64 غير صالح): {path}"),
            ("en", "Unreadable media file (invalid base64): {path}"),
        ],
    ),
    (
        "qcp.save.duplicateAsset",
        &[
            ("fr", "Fichier média dupliqué dans l'archive : {path}"),
            ("es", "Archivo multimedia duplicado en el paquete: {path}"),
            ("de", "Mediendatei im Archiv doppelt: {path}"),
            ("it", "File multimediale duplicato nell'archivio: {path}"),
            ("pt", "Arquivo de mídia duplicado no pacote: {path}"),
            ("nl", "Mediabestand gedupliceerd in het archief: {path}"),
            ("ru", "Дубликат медиафайла в архиве: {path}"),
            ("ja", "書庫内にメディアファイルが重複しています: {path}"),
            ("zh", "归档中的媒体文件重复：{path}"),
            ("ar", "ملف وسائط مكرر في الأرشيف: {path}"),
            ("en", "Duplicate media file in the archive: {path}"),
        ],
    ),
    (
        "qcp.save.finishFailed",
        &[
            ("fr", "Fermeture de l'archive impossible : {error}"),
            ("es", "No se pudo cerrar el paquete: {error}"),
            ("de", "Archiv konnte nicht geschlossen werden: {error}"),
            ("it", "Impossibile chiudere l'archivio: {error}"),
            ("pt", "Não foi possível fechar o pacote: {error}"),
            ("nl", "Archief kon niet worden gesloten: {error}"),
            ("ru", "Не удалось закрыть архив: {error}"),
            ("ja", "書庫を閉じられませんでした: {error}"),
            ("zh", "无法关闭归档：{error}"),
            ("ar", "تعذر إغلاق الأرشيف: {error}"),
            ("en", "Could not finish the archive: {error}"),
        ],
    ),
    (
        "qcp.open.readFailed",
        &[
            ("fr", "Ouverture du fichier impossible : {error}"),
            ("es", "No se pudo abrir el archivo: {error}"),
            ("de", "Datei konnte nicht geöffnet werden: {error}"),
            ("it", "Impossibile aprire il file: {error}"),
            ("pt", "Não foi possível abrir o arquivo: {error}"),
            ("nl", "Bestand kon niet worden geopend: {error}"),
            ("ru", "Не удалось открыть файл: {error}"),
            ("ja", "ファイルを開けませんでした: {error}"),
            ("zh", "无法打开文件：{error}"),
            ("ar", "تعذر فتح الملف: {error}"),
            ("en", "Could not open the file: {error}"),
        ],
    ),
    (
        "qcp.open.notArchive",
        &[
            (
                "fr",
                "Ce fichier n'est pas une archive projet (.qrd) lisible.",
            ),
            (
                "es",
                "Este archivo no es un paquete de proyecto (.qrd) legible.",
            ),
            ("de", "Diese Datei ist kein lesbares Projektarchiv (.qrd)."),
            (
                "it",
                "Questo file non è un archivio di progetto (.qrd) leggibile.",
            ),
            (
                "pt",
                "Este arquivo não é um pacote de projeto (.qrd) legível.",
            ),
            ("nl", "Dit bestand is geen leesbaar projectarchief (.qrd)."),
            ("ru", "Этот файл — не читаемый архив проекта (.qrd)."),
            (
                "ja",
                "このファイルは読み取り可能なプロジェクト書庫（.qrd）ではありません。",
            ),
            ("zh", "此文件不是可读取的项目归档（.qrd）。"),
            ("ar", "هذا الملف ليس أرشيف مشروع (.qrd) قابلاً للقراءة."),
            ("en", "This file is not a readable project archive (.qrd)."),
        ],
    ),
    (
        "qcp.open.corrupt",
        &[
            ("fr", "Archive corrompue : {error}"),
            ("es", "Paquete dañado: {error}"),
            ("de", "Beschädigtes Archiv: {error}"),
            ("it", "Archivio danneggiato: {error}"),
            ("pt", "Pacote corrompido: {error}"),
            ("nl", "Beschadigd archief: {error}"),
            ("ru", "Архив повреждён: {error}"),
            ("ja", "書庫が壊れています: {error}"),
            ("zh", "归档已损坏：{error}"),
            ("ar", "الأرشيف تالف: {error}"),
            ("en", "Corrupted archive: {error}"),
        ],
    ),
    (
        "qcp.open.manifestUnreadable",
        &[
            ("fr", "Manifeste illisible : {error}"),
            ("es", "Manifiesto ilegible: {error}"),
            ("de", "Manifest unlesbar: {error}"),
            ("it", "Manifesto illeggibile: {error}"),
            ("pt", "Manifesto ilegível: {error}"),
            ("nl", "Manifest onleesbaar: {error}"),
            ("ru", "Манифест нечитаем: {error}"),
            ("ja", "マニフェストを読み取れません: {error}"),
            ("zh", "清单无法读取：{error}"),
            ("ar", "البيان غير قابل للقراءة: {error}"),
            ("en", "Unreadable manifest: {error}"),
        ],
    ),
    (
        "qcp.open.manifestMissing",
        &[
            (
                "fr",
                "Archive projet invalide : manifest.json est manquant.",
            ),
            ("es", "Paquete de proyecto no válido: falta manifest.json."),
            ("de", "Ungültiges Projektarchiv: manifest.json fehlt."),
            (
                "it",
                "Archivio di progetto non valido: manifest.json assente.",
            ),
            (
                "pt",
                "Pacote de projeto inválido: manifest.json está ausente.",
            ),
            ("nl", "Ongeldig projectarchief: manifest.json ontbreekt."),
            (
                "ru",
                "Недопустимый архив проекта: manifest.json отсутствует.",
            ),
            ("ja", "無効なプロジェクト書庫: manifest.json がありません。"),
            ("zh", "项目归档无效：缺少 manifest.json。"),
            ("ar", "أرشيف مشروع غير صالح: manifest.json مفقود."),
            ("en", "Invalid project archive: manifest.json is missing."),
        ],
    ),
    (
        "qcp.open.assetTooLarge",
        &[
            ("fr", "Fichier média trop volumineux : {path}"),
            ("es", "Archivo multimedia demasiado grande: {path}"),
            ("de", "Mediendatei zu groß: {path}"),
            ("it", "File multimediale troppo grande: {path}"),
            ("pt", "Arquivo de mídia muito grande: {path}"),
            ("nl", "Mediabestand te groot: {path}"),
            ("ru", "Слишком большой медиафайл: {path}"),
            ("ja", "メディアファイルが大きすぎます: {path}"),
            ("zh", "媒体文件过大：{path}"),
            ("ar", "ملف وسائط كبير جدًا: {path}"),
            ("en", "Media file too large: {path}"),
        ],
    ),
    (
        "qcp.open.assetUnreadable",
        &[
            ("fr", "Fichier média illisible : {error}"),
            ("es", "Archivo multimedia ilegible: {error}"),
            ("de", "Mediendatei unlesbar: {error}"),
            ("it", "File multimediale illeggibile: {error}"),
            ("pt", "Arquivo de mídia ilegível: {error}"),
            ("nl", "Mediabestand onleesbaar: {error}"),
            ("ru", "Нечитаемый медиафайл: {error}"),
            ("ja", "メディアファイルを読み取れません: {error}"),
            ("zh", "媒体文件无法读取：{error}"),
            ("ar", "ملف وسائط غير قابل للقراءة: {error}"),
            ("en", "Unreadable media file: {error}"),
        ],
    ),
    (
        "updater.check.failed",
        &[
            ("fr", "Recherche de mise à jour interrompue : {error}"),
            ("es", "La búsqueda de actualización se interrumpió: {error}"),
            ("de", "Update-Suche unterbrochen: {error}"),
            ("it", "Ricerca dell'aggiornamento interrotta: {error}"),
            ("pt", "A busca de atualização foi interrompida: {error}"),
            ("nl", "Zoeken naar update onderbroken: {error}"),
            ("ru", "Поиск обновления прерван: {error}"),
            ("ja", "アップデート確認が中断されました: {error}"),
            ("zh", "检查更新中断：{error}"),
            ("ar", "توقف التحقق من التحديث: {error}"),
            ("en", "Update check interrupted: {error}"),
        ],
    ),
    (
        "updater.download.failed",
        &[
            ("fr", "Téléchargement interrompu : {error}"),
            ("es", "La descarga se interrumpió: {error}"),
            ("de", "Download unterbrochen: {error}"),
            ("it", "Il download è stato interrotto: {error}"),
            ("pt", "O download foi interrompido: {error}"),
            ("nl", "Download onderbroken: {error}"),
            ("ru", "Загрузка прервана: {error}"),
            ("ja", "ダウンロードが中断されました: {error}"),
            ("zh", "下载已中断：{error}"),
            ("ar", "توقف التنزيل: {error}"),
            ("en", "Download interrupted: {error}"),
        ],
    ),
    (
        "updater.install.failed",
        &[
            ("fr", "Ouverture de l'installateur impossible : {error}"),
            ("es", "No se puede abrir el instalador: {error}"),
            ("de", "Installationsprogramm konnte nicht geöffnet werden: {error}"),
            ("it", "Impossibile aprire il programma di installazione: {error}"),
            ("pt", "Não é possível abrir o instalador: {error}"),
            ("nl", "Installatieprogramma kan niet worden geopend: {error}"),
            ("ru", "Не удалось открыть установщик: {error}"),
            ("ja", "インストーラーを開けません: {error}"),
            ("zh", "无法打开安装程序：{error}"),
            ("ar", "تعذر فتح برنامج التثبيت: {error}"),
            ("en", "Unable to open the installer: {error}"),
        ],
    ),
    (
        "updater.open.failed",
        &[
            ("fr", "Ouverture de la page impossible : {error}"),
            ("es", "No se puede abrir la página: {error}"),
            ("de", "Seite konnte nicht geöffnet werden: {error}"),
            ("it", "Impossibile aprire la pagina: {error}"),
            ("pt", "Não é possível abrir a página: {error}"),
            ("nl", "Pagina kan niet worden geopend: {error}"),
            ("ru", "Не удалось открыть страницу: {error}"),
            ("ja", "ページを開けません: {error}"),
            ("zh", "无法打开页面：{error}"),
            ("ar", "تعذر فتح الصفحة: {error}"),
            ("en", "Unable to open the page: {error}"),
        ],
    ),
];

/// Change la langue des messages renvoyés au webview. Idempotent ; seule la
/// sous-étiquette primaire est retenue (« pt-BR » → « pt »), comme côté
/// frontend. Appelée par la commande `set_ui_locale`.
pub fn set_locale(locale: &str) {
    *UI_LOCALE.write().expect("verrou i18n") = language_code(locale);
}

/// Langue normalisée demandée, en repli « en » si vide ou mal formée.
fn language_code(locale: &str) -> String {
    let primary = locale
        .split(['-', '_'])
        .next()
        .unwrap_or_default()
        .to_lowercase();
    if primary.is_empty() {
        "en".to_string()
    } else {
        primary
    }
}

/// Texte d'une clé pour la langue courante. La langue courante du catalogue
/// gagne ; sinon repli anglais ; sinon la clé brute (jamais attendu : le
/// catalogue sert les clés du crate uniquement).
fn lookup(language: &str, key: &str) -> String {
    if let Some((_, translations)) = ENTRIES.iter().find(|(k, _)| *k == key) {
        if let Some((_, text)) = translations.iter().find(|(lang, _)| *lang == language) {
            return (*text).to_string();
        }
        if let Some((_, text)) = translations.iter().find(|(lang, _)| *lang == "en") {
            return (*text).to_string();
        }
    }
    key.to_string()
}

/// Message traduit pour la langue courante, avec substitution des marqueurs
/// `{nom}`. Les valeurs manquantes laissent le marqueur apparent (poste de
/// débogage), comme l'interpolation côté frontend.
pub fn tr(key: &str, params: &[(&str, &str)]) -> String {
    let language = language_code(&UI_LOCALE.read().expect("verrou i18n").clone());
    let mut text = lookup(&language, key);
    for (name, value) in params {
        text = text.replace(&format!("{{{name}}}"), value);
    }
    text
}

#[cfg(test)]
mod tests {
    use super::*;

    /// L'anglais fait foi : chaque entrée fournit le repli de dernière main.
    #[test]
    fn english_fallback_present() {
        for (key, translations) in ENTRIES {
            assert!(
                translations.iter().any(|(lang, _)| *lang == "en"),
                "clé « {key} » sans traduction anglaise"
            );
        }
    }

    /// Parité stricte : chaque clé est servie dans les 11 langues de
    /// l'interface (en, fr, es, de, it, pt, nl, ru, ja, zh, ar).
    #[test]
    fn locale_parity() {
        const LANGUAGES: usize = 11;
        for (key, translations) in ENTRIES {
            assert_eq!(translations.len(), LANGUAGES, "clé « {key} » incomplète");
        }
    }

    /// Détection de langue : sous-étiquette primaire, repli anglais si vide.
    #[test]
    fn language_codes() {
        assert_eq!(language_code("fr-CA"), "fr");
        assert_eq!(language_code("zh_Hans"), "zh");
        assert_eq!(language_code(""), "en");
    }
}
