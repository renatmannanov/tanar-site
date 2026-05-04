# Step 1: Копирование исходников в assets/ (под .gitignore)

> Статус: done

## Цель

Перенести оригиналы фото и лого из `Downloads/` в стабильную папку `<repo>/assets/` (внутри проекта, в `.gitignore`). После этого `Downloads/` можно чистить — все источники будут в одном предсказуемом месте, удобном для sharp-скрипта.

## Действия

1. Создать папку `<repo>/assets/`
2. Скопировать структуру фото-папок (15 товарных + others) в `assets/products/<slug>/<color>/`:
   - Из `Downloads/tanar_photo/Айман спорт/shell_jacket_<color>_<sex>/` → `assets/products/shell-jacket-khan/<color>/<sex>/`
   - Из `Downloads/tanar_photo/Айман спорт/light_jacket_<color>_<sex>/` (включая `ligth_jacket_orange_man` — опечатка в источнике) → `assets/products/light-jacket-tengri/<color>/<sex>/`
   - Из `Downloads/tanar_photo/Айман спорт/hodie_<color>_<sex>/` → `assets/products/hoodie-alatau/` (для green, darkgrey, lightgrey) или `hoodie-turgen/` (для lightpink, red), внутри `<color>/<sex>/`
   - Из `Downloads/tanar_photo/Айман спорт/tshirt_<color>_<sex>/` → `assets/products/tshirt-tanar/<color>/<sex>/`
3. Поправить опечатки в путях при копировании:
   - `shaell_jacket__white_girl` → `shell-jacket-khan/white/girl/`
4. Скопировать `others/` как есть в `assets/lifestyle/`:
   - `others/2_of_them` → `assets/lifestyle/two/`
   - `others/jacket_black_man` → `assets/lifestyle/black-jacket-man/`
   - `others/jacket_lightblue_girl` → `assets/lifestyle/lightblue-jacket-girl/`
   - `others/jacket_white_girl_dog` → `assets/lifestyle/white-jacket-dog/`
5. Скопировать лого:
   - `Downloads/tanar_logo/TANAR/01 - Логотип/03 - Знак/PNG (водяной знак)/*.png` → `assets/logo/mark/`
   - `Downloads/tanar_logo/TANAR/01 - Логотип/01 - Основная версия/PNG (водяной знак)/*.png` → `assets/logo/main/`
   - `Downloads/tanar_logo/TANAR/01 - Логотип/04 - Горизонтальная версия/PNG (водяной знак)/*.png` → `assets/logo/horizontal/`
6. НЕ копировать `arch/` подпапки внутри товарных — это служебные оригиналы фотографа, для сайта не нужны
7. НЕ копировать AI/EPS/PDF лого — только PNG
8. Внутри файлов с `1_front.jpg`/`1_side.jpg`/`1_back.jpg` — оставить имена как есть, sharp-скрипт их распознает

## Критерии готовности

- [ ] Папка `<repo>/assets/` существует
- [ ] `find assets/products -name "1_front.jpg" | wc -l` = столько, сколько цвет-моделей-сторон (минимум 15 — по одной front-фотке на цвет; если есть м/ж пары — больше)
- [ ] `find assets/lifestyle -name "*.jpg" | wc -l` >= 10
- [ ] `find assets/logo -name "*.png" | wc -l` >= 3
- [ ] В `products/` нет `arch/` подпапок: `find assets/products -type d -name arch` пусто
- [ ] `assets/` есть в `.gitignore` (`git check-ignore -v assets/products/...` подтверждает игнор)

## Verification

```bash
ls -la <repo>/assets/
find <repo>/assets/products -maxdepth 3 -type d
du -sh <repo>/assets/
```
