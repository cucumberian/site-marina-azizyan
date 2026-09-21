# AGENTS.md

Страница художницы Марины Азизян: статичные HTML + CSS + vanilla JS, без сборки и зависимостей.

## Структура

```
index.html              страница
assets/css/style.css    оформление
assets/js/app.js        карусели, лайтбокс и т.п.
assets/js/data.js       данные галерей — ГЕНЕРИРУЕТСЯ, руками не править
assets/web/             оптимизированные WebP для сайта + manifest.json (генерируются)
images/                 ИСХОДНИКИ JPG (sp01–sp22.jpg) — только исходники, ничего для веба
images/albums/          исходники альбомов: <год>-<название>/<номер>.jpg
images/albums/cover.jpg, person.jpg
_src/                   scraped-референсы (FB, spbcult, ved…) — только читать, не менять
_build/, _thumbs/       пустые служебные папки
tools/                  локальные тулзы сборки — в .gitignore, в git не входят
_config.yml             публикация GitHub Pages: exclude служебных файлов
```

## Правила

- **Исходники живут в `images/`, оптимизированные WebP — в `assets/web/`. Не смешивать:** JPG из `images/` никогда не кладём в `assets/`, WebP из `assets/` не копипастим в `images/`.
- Формат веба (зафиксирован, рабочий вариант): **WebP, полная версия — максимум 1400 px по длинной стороне, quality 75** (`method=6`); preview для карточек — 560 px, quality 78. Менять только по явному решению. `images/` в `.gitignore` (исходники не в репозитории).
- Страница всегда остаётся раздельной (HTML + CSS + JS + картинки). Однофайловая сборка (`site.html`, `build_standalone.py`) **удалена** — не восстанавливать.
- `assets/js/data.js` и `assets/web/*` — артефакты сборки. Правим списки в `tools/build_images.py` (`STUDIO`) и `tools/build_data.py` (`SECTIONS`), потом пересобираем.
- Тулзы уже указывают на `images/`: `build_images.py` читает `images/sp*.jpg` и папки альбомов (`2013-meschanin`, `2013-tartuf`, `2017-don juan`, `2017-borey-vot moya derevnya`, `2020-nos zagovor ne takih`). В именах папок есть пробелы — в shell кавычки обязательны.
- Секции «История» и «Лента новостей» — статичный HTML в `index.html` (разметка `.timeline`/`.t-row`). Факты и ссылки: Википедия, Кинопоиск, Музей театрального и музыкального искусства (theatremuseum.ru), «СПб ведомости», «Культура Петербурга».
- `_src/vitanova-azizyan-bio.txt` — справка о художнице из книги «Вита Нова» («Тартюф» / «Дон Жуан»). Источник фактов; дословно в текст страницы не вставлять без явного разрешения хозяйки.
- Новые альбомы: папка `images/albums/<год>-<slug>/<NN>.jpg`, обложка альбома для страницы — `assets/web/album-<slug>.webp` (ссылки на неё уже в `index.html`).
- Страница статичная: не добавлять сборщики, фреймворки и npm.
- Публикация — GitHub Pages из репозитория (Jekyll, без `.nojekyll`): на сайт попадает **всё из git**. Служебные файлы (`AGENTS.md`, `README.md`) исключены в `_config.yml` — каждый новый внутренний файл добавлять туда же. GitHub-экшен не нужен: пересборки в CI нет (`tools/` и `images/` в git не входят), ветки «deploy from branch» достаточно.

## Тулзы сборки (локальные, в git нет — пересоздаются по описанию ниже)

Оба скрипта на Python 3 + Pillow, запускать из корня репозитория. Если файлов нет —
восстановить по этому описанию.

### `tools/build_images.py` — images/ → assets/web/

- Списки в самом скрипте:
  - `STUDIO` — кортежи `(файл, slug, подпись)` для `images/sp*.jpg` (студийные фото);
  - `ALBUMS` — кортежи `(папка, ключ, подпись-префикс)` для папок альбомов
    (`2013-meschanin`, `2013-tartuf`, `2017-don juan`, `2017-borey-vot moya derevnya`,
    `2020-nos zagovor ne takih`); файлы в папке глобятся `*.jpg` по алфавиту, slug = `<ключ>-NN`;
  - `COVERS` — кортежи `(_src/albumN.png, slug)` — обложки альбомов (×4 апскейл + unsharp,
    quality 84 → `assets/web/album-<slug>.webp`); исходники в `_src/` (тоже в git нет).
- Группы: slug'ы из списка текстиля (`quilt-table`, `textile-wall`, `textile-dolls`,
  `embroidery`, `sofa-quilts`, `vitrine`) → группа `textile`, остальные `studio`;
  альбомы → группа по ключу (`nos`, `don-juan`, `meshchanin`, `tartuf`, `vot-moya-derevnya`).
- На каждую картинку: EXIF-поворот → RGB → `assets/web/<slug>.webp`
  (длинная сторона ≤1400, quality 75, method=6, LANCZOS) +
  `assets/web/preview/<slug>.webp` (≤560, quality 78).
- Запись в манифест: `{id, src, thumb, w, h, caption, credit, aspect}`;
  credit студийных — «Фото: Ирина Иванова / „Культура Петербурга“, 2024», альбомов — «Из архива художницы».
- Пишет `assets/web/manifest.json` — dict: группа → список записей.

### `tools/build_data.py` — manifest.json → assets/js/data.js

- Читает `assets/web/manifest.json`, список `SECTIONS` в скрипте — по dicts
  `{id, title, meta, desc}`; `items = manifest[id]`.
- Первые четыре (`studio`, `textile`, `nos`, `don-juan`) — галереи на странице;
  последние три (`meshchanin`, `tartuf`, `vot-moya-derevnya`) — без галереи,
  только чтобы лайтбокс открывался по клику на обложку альбома.
- Пишет `assets/js/data.js`: `window.AZ_DATA = {"sections": [...]};`

## Пересборка

```bash
python3 tools/build_images.py && python3 tools/build_data.py
```

Локальный просмотр: `python3 -m http.server 8080`. `?static=1` — все секции сразу, без анимаций (для скриншотов).
