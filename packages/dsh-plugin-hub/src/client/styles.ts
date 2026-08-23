/**
 * Section styling, in the harness's own design tokens.
 *
 * `--dsw-alias-*` are the client's theme aliases, so this section follows the
 * app's light and dark themes instead of pinning colours that would look wrong
 * in one of them.
 */
export const styles = String.raw`
.dshFish {
  max-width: 760px;
  color: var(--dsw-alias-label-primary);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dshFish__heading {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.dshFish__intro {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
}
.dshFish__tabs {
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  display: flex;
  align-items: flex-end;
  gap: 22px;
  margin-top: 2px;
}
.dshFish__tab {
  border: 0;
  padding: 7px 1px 9px;
  position: relative;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
}
.dshFish__tab:hover,
.dshFish__tab[data-active="true"] {
  color: var(--dsw-alias-label-primary);
}
.dshFish__tab[data-active="true"]::after,
.dshFish__tab:focus-visible::after {
  content: "";
  height: 2px;
  border-radius: 2px 2px 0 0;
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  background: var(--dsw-alias-label-primary);
}
.dshFish__tab:focus-visible {
  border-radius: 2px;
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
}
.dshFish__panel {
  min-width: 0;
  padding-top: 2px;
}
.dshFish__panelBody {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dshFish__search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.dshFish__input,
.dshFish__select {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  padding: 6px 10px;
  background: var(--dsw-alias-bg-primary);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
}
.dshFish__input {
  flex: 1 1 220px;
  min-width: 0;
}
.dshFish__button,
.dshFish__buttonQuiet {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  padding: 6px 12px;
  background: var(--dsw-alias-bg-secondary);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.dshFish__button:disabled,
.dshFish__buttonQuiet:disabled {
  opacity: 0.55;
  cursor: default;
}
.dshFish__buttonQuiet {
  background: transparent;
  color: var(--dsw-alias-label-secondary);
}
.dshFish__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dshFish__card {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dshFish__cardHead {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.dshFish__cardName {
  font-size: 14px;
  font-weight: 600;
}
.dshFish__cardSummary {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 19px;
}
.dshFish__cardFoot {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.dshFish__tag {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  padding: 1px 8px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 18px;
}
.dshFish__meta,
.dshFish__empty {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
.dshFish__link {
  color: var(--dsw-alias-state-business-primary);
  font-size: 12px;
}
.dshFish__plan {
  border-top: 1px solid var(--dsw-alias-border-l2);
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dshFish__planTitle {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
.dshFish__commands {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}
.dshFish__planActions {
  display: flex;
  gap: 8px;
}
.dshFish__warning,
.dshFish__error {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
}
.dshFish__warning {
  color: var(--dsw-alias-label-secondary);
}
.dshFish__error {
  color: var(--dsw-alias-state-error-primary, #c0392b);
}
.dshFish__notice {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.dshFish__device {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
.dshFish__code {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.dshFish__srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
`
