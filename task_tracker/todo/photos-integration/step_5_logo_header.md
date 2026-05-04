# Step 5: Замена логотипа в шапке и футере

> Статус: pending

## Цель

Заменить текущий лого (SVG-треугольник + "Tanar / outdoor · kazakhstan") на знак-гору из брендбука + слово "TANAR". Без сабтайтла, без слогана. **Сохранить пропс `variant: 'light' | 'dark'`** — он используется в Footer для светлого варианта на тёмном фоне.

## Действия

### 1. Подготовить файл лого

Из `assets/logo/mark/` (PNG со знаком-горой) выбрать вариант на прозрачном фоне (без водяного знака если возможно). Если все варианты с водяным знаком — выбрать самый компактный, на размере шапки (32-40px) знак почти незаметен.

**Если знак однотонный (чёрный/тёмный)** — нужны **две версии**: тёмная для светлой шапки + светлая для тёмного футера. Можно:
- Скопировать ту же PNG как `mark.png`, и сделать инвертированную версию `mark-light.png` (через sharp `.negate()` или вручную)
- Или **проще**: сохранить как SVG (если есть исходник) и менять цвет через CSS `currentColor` / Tailwind `[mask]`-trick
- Или **самое простое**: использовать одну PNG и через CSS `filter: invert(1)` для тёмного варианта (если знак монохромный — работает)

Скопировать выбранные файлы в `public/logo/`:
- `public/logo/mark.png` — тёмный знак (для светлой шапки)
- `public/logo/mark-light.png` — светлый знак (для тёмного футера) — **только если знак монохромный и инверсия имеет смысл**

Если знак цветной/градиентный (не монохром) — используем одну PNG, светлый вариант делаем через CSS-обёртку с `bg-stone-900` и подбираем что выглядит нормально.

### 2. Обновить компонент `src/components/Logo.tsx`

Текущая реализация — SVG-треугольник + текст "Tanar / outdoor · kazakhstan". Заменить на:
- Image со знаком-горой (32×32, h-8)
- Текст "TANAR" заглавными
- **Без сабтайтла** "outdoor · kazakhstan"
- **Сохранить пропс `variant`** — Footer его использует

```tsx
import Image from 'next/image';
import Link from 'next/link';

type LogoProps = {
  variant?: 'light' | 'dark';
};

export default function Logo({ variant = 'dark' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-stone-900';
  const markSrc = variant === 'light' ? '/logo/mark-light.png' : '/logo/mark.png';
  // Если используем одну PNG + CSS-инверсию — заменить на:
  // const markClass = variant === 'light' ? 'invert' : '';

  return (
    <Link href="/" className="flex items-center gap-2 group" aria-label="Tanar — главная">
      <Image
        src={markSrc}
        alt=""
        width={32}
        height={32}
        priority
        className="h-8 w-auto shrink-0"
      />
      <span
        className={`font-display text-xl font-bold uppercase tracking-widest leading-none ${textColor}`}
      >
        {/* В JSX оставляем "Tanar" — Tailwind `uppercase` отрендерит как TANAR.
            Не переписывать на "TANAR" в исходнике, иначе селектят и копируют визуально криво. */}
        Tanar
      </span>
    </Link>
  );
}
```

**Что должно остаться от текущей версии:**
- `font-display` (фирменный шрифт)
- `font-bold uppercase tracking-widest` (стиль текста)
- Пропс `variant` с дефолтом `'dark'`
- `default export` (Footer и Header импортируют как `import Logo from ...`)

**Что меняется:**
- SVG-треугольник → `<Image>` с реальным знаком из брендбука
- Двухстрочный блок (Tanar / outdoor · kazakhstan) → одна строка с "Tanar"
- `gap-3` → `gap-2` (плотнее, без сабтайтла визуально нужно меньше воздуха)

### 3. Проверить, что лого корректно рендерится в обоих местах

- `Header.tsx` — светлый фон, `<Logo />` без пропса = `variant="dark"` = тёмный знак + тёмный текст ✅
- `Footer.tsx` — тёмный фон, `<Logo variant="light" />` = светлый знак + белый текст ✅
- `MobileNav.tsx` — посмотреть что используется, варианта не должно сломать

### 4. Удалить старые ассеты лого

Если в `public/` лежат старые SVG для лого — НЕ трогать в этом шаге, отдельная уборка. Но если есть `logo-old.png` или подобное — удалить.

## Критерии готовности

- [ ] `public/logo/mark.png` существует
- [ ] `public/logo/mark-light.png` существует (или одна PNG + CSS-инверсия задокументирована в Logo.tsx)
- [ ] `src/components/Logo.tsx` показывает: знак-гора + "Tanar" (без сабтайтла), `variant` пропс сохранён
- [ ] Никаких следов "outdoor · kazakhstan" / "Born to Rise" в коде Logo.tsx
- [ ] Header (светлый фон) — лого выглядит нормально
- [ ] Footer (тёмный фон) — лого выглядит нормально (светлая версия)
- [ ] `npm run typecheck` — exit 0
- [ ] `npm run lint` — exit 0
- [ ] Лого кликабельно, ведёт на `/`

## Verification

```bash
ls -la public/logo/
grep -rn "outdoor · kazakhstan\|Born to" src/ public/ || echo "no traces"
grep -n "variant" src/components/Logo.tsx
npm run dev
```

(Дев-сервер запустить отдельно, проверить в браузере шапку и футер.)

## Что НЕ делать

- НЕ выкидывать пропс `variant` — Footer на нём держится
- НЕ менять `default export` на `named export` — все импорты сломаются
- НЕ менять размер шапки или её layout — только содержимое логотипа
- НЕ генерировать favicon в этом шаге (это отдельная задача, можно потом)
