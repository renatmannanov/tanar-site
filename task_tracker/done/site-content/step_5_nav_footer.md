# Шаг 5: Футер + навигация (живые ссылки)

> Зависит от: шаги 1, 3, 4 (статьи и страницы существуют — ссылки не битые)
> Статус: [ ] pending

## Задача

Оживить мёртвые ссылки `href="#"` в футере и поправить навигацию. Контакты берём из `src/lib/site-contacts.ts` (шаг 3) — единый источник уже в итерации 1.

### Footer (`src/components/Footer.tsx`)

Текущие заглушки: `companyLinks` (О нас #, Блог, Контакты #), `supportLinks` (Доставка #, Возврат #, FAQ #), `socialLinks` (Instagram #, Telegram #).

Изменить:
- **Компания:** «О бренде» → `/blog/o-brende-tanar` (статья), «Блог» → `/blog`, «Контакты» → `/contacts`.
- **Поддержка:** «FAQ» → `/faq`. **Убрать «Доставка» и «Возврат»** (их содержимое теперь в FAQ).
- **Связь/соцсети:** «Instagram» → https://instagram.com/tanar_qazaqstan (из site-contacts). **Убрать «Telegram»** (пока нет).
- **Контакты в футере:** добавить телефон(ы) (`tel:`) и адрес из `site-contacts`.
  - ⚠️ Тип `FooterSection.links` = `ReadonlyArray<{label, href}>` — он держит только ссылки, НЕ произвольный текст/адрес. Поэтому: телефоны добавить как link-элементы (`href: 'tel:+7...'`, оба номера) в колонку «Связь» — это валидно (tel: — это href). **Адрес** (текст без href) — НЕ как link-элемент, а **отдельным текстовым блоком** под колонками или в нижней плашке. НЕ расширять тип `FooterSection` ради адреса.
- **Нижняя плашка:** к «© 2026 Tanar» добавить мелким **«ИП СУЛТАНГАЛИЕВА · БИН 770807401605»** (из data-from-docx, раздел 6). IBAN/банк НЕ добавлять.
- Не должно остаться ни одного `href="#"`.

### Header + MobileNav (`src/components/Header.tsx`, `src/components/MobileNav.tsx`)

Оба содержат идентичный `navLinks` (дублирование). Изменить в обоих:
- «Контакты» → `/contacts` (было `/#footer`).
- «О бренде» → оставить `/#story` (якорь на StoryBlock главной) — зафиксировано: НЕ меняем на статью, тизер на главной остаётся точкой входа.
- (Опционально, НЕ обязательно) вынести `navLinks` в общий модуль, чтобы не дублировать — но это рефактор, в scope шага НЕ входит; просто синхронно поправить оба файла.

## Тесты

- e2e `layout.spec.ts` («footer contains brand name and location») — не ломается (Tanar/Казахстан остаются).
- Дополнить e2e: в футере нет `a[href="#"]`; ссылка «Контакты» в шапке ведёт на `/contacts`; «FAQ» в футере — на `/faq`.
- e2e `responsive.spec.ts` (бургер) — навигация не сломана.

## Команды для верификации

```powershell
npm run typecheck
npm run lint
npm run build
npm run db:up; npm run db:seed
npm run test:e2e
```

## Критерии готовности

- [ ] В футере нет `href="#"`; Контакты/FAQ/Блог/О бренде/Instagram рабочие; Telegram и Доставка/Возврат убраны
- [ ] Футер показывает телефон (tel:) + адрес + ИП+БИН (из site-contacts/константы)
- [ ] Header и MobileNav: «Контакты» → `/contacts` (оба файла синхронны)
- [ ] `npm run typecheck/lint/build/test:e2e` зелёные
- [ ] Коммит: `feat(site): live footer/nav links (contacts, faq, instagram); legal line`
