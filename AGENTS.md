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
tools/build_images.py   сжимает images/ → assets/web/
tools/build_data.py     собирает assets/js/data.js из assets/web/manifest.json
```

## Правила

- **Исходники живут в `images/`, оптимизированные WebP — в `assets/web/`. Не смешивать:** JPG из `images/` никогда не кладём в `assets/`, WebP из `assets/` не копипастим в `images/`.
- Формат веба (зафиксирован, рабочий вариант): **WebP, полная версия — максимум 1400 px по длинной стороне, quality 75** (`method=6`); preview для карточек — 560 px, quality 78. Менять только по явному решению. `images/` в `.gitignore` (исходники не в репозитории).
- Страница всегда остаётся раздельной (HTML + CSS + JS + картинки). Однофайловая сборка (`site.html`, `build_standalone.py`) **удалена** — не восстанавливать.
- `assets/js/data.js` и `assets/web/*` — артефакты сборки. Правим списки в `tools/build_images.py` (`STUDIO`) и `tools/build_data.py` (`SECTIONS`), потом пересобираем.
- Тулзы уже указывают на `images/`: `build_images.py` читает `images/sp*.jpg` и папки альбомов (`2013-meschanin`, `2013-tartuf`, `2017-don juan`, `2017-borey-vot moya derevnya`, `2020-nos zagovor ne takih`). В именах папок есть пробелы — в shell кавычки обязательны.
- Секции «История» и «Лента новостей» — статичный HTML в `index.html` (разметка `.timeline`/`.t-row`). Факты и ссылки: Википедия, Кинопоиск, Музей театрального и музыкального искусства (theatremuseum.ru), «СПб ведомости», «Культура Петербурга».
- Новые альбомы: папка `images/albums/<год>-<slug>/<NN>.jpg`, обложка альбома для страницы — `assets/web/album-<slug>.webp` (ссылки на неё уже в `index.html`).
- Страница статичная: не добавлять сборщики, фреймворки и npm.

## Пересборка

```bash
python3 tools/build_images.py && python3 tools/build_data.py
```

Локальный просмотр: `python3 -m http.server 8080`. `?static=1` — все секции сразу, без анимаций (для скриншотов).
