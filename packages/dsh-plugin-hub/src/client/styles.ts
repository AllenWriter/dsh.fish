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
  gap: 14px;
}
.dshFish__heading {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.dshFish__intro {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 1.5;
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
  padding: 8px 2px 10px;
  position: relative;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
  transition: color 0.15s ease;
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
  gap: 14px;
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
  padding: 7px 11px;
  background: var(--dsw-alias-bg-primary);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.dshFish__input:focus,
.dshFish__select:focus {
  outline: none;
  border-color: var(--dsw-alias-state-business-primary, #0070f3);
  box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.15);
}
.dshFish__input {
  flex: 1 1 220px;
  min-width: 0;
}
.dshFish__button,
.dshFish__buttonQuiet {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  padding: 6px 13px;
  background: var(--dsw-alias-bg-secondary);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
}
.dshFish__button:hover:not(:disabled) {
  background: var(--dsw-alias-bg-primary);
  border-color: var(--dsw-alias-border-l1);
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
.dshFish__buttonQuiet:hover:not(:disabled) {
  background: var(--dsw-alias-bg-secondary);
  color: var(--dsw-alias-label-primary);
}
.dshFish__button--primary {
  background: var(--dsw-alias-state-business-primary, #0070f3);
  border-color: var(--dsw-alias-state-business-primary, #0070f3);
  color: #ffffff;
}
.dshFish__button--primary:hover:not(:disabled) {
  background: var(--dsw-alias-state-business-primary, #0070f3);
  filter: brightness(1.1);
  border-color: transparent;
  color: #ffffff;
}
.dshFish__button--destructive {
  color: var(--dsw-alias-state-error-primary, #dc2626);
  border-color: rgba(220, 38, 38, 0.25);
}
.dshFish__button--destructive:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.08);
  border-color: var(--dsw-alias-state-error-primary, #dc2626);
  color: var(--dsw-alias-state-error-primary, #dc2626);
}

@keyframes dshFishSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.dshFish__spin {
  animation: dshFishSpin 0.75s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}

.dshFish__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dshFish__card {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  padding: 14px 16px;
  background: var(--dsw-alias-bg-primary);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}
.dshFish__card--clickable {
  cursor: pointer;
}
.dshFish__card--clickable:hover {
  border-color: var(--dsw-alias-state-business-primary, #0070f3);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
  transform: translateY(-1px);
}
.dshFish__card--clickable:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #0070f3);
  outline-offset: 2px;
}
.dshFish__cardHead {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.dshFish__cardName {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}
.dshFish__cardSummary {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dshFish__cardFoot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.dshFish__cardActions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.dshFish__tag {
  border-radius: 999px;
  padding: 1.5px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dshFish__tag--kind {
  background: var(--dsw-alias-bg-secondary);
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
}
.dshFish__tag--verified {
  background: rgba(0, 112, 243, 0.08);
  color: var(--dsw-alias-state-business-primary, #0070f3);
  border: 1px solid rgba(0, 112, 243, 0.22);
}
.dshFish__tag--deprecated {
  background: rgba(220, 38, 38, 0.08);
  color: var(--dsw-alias-state-error-primary, #dc2626);
  border: 1px solid rgba(220, 38, 38, 0.22);
}
.dshFish__tag--ai {
  background: rgba(147, 51, 234, 0.08);
  color: #9333ea;
  border: 1px solid rgba(147, 51, 234, 0.22);
}
.dshFish__meta,
.dshFish__empty {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dshFish__link {
  color: var(--dsw-alias-state-business-primary, #0070f3);
  font-size: 12px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dshFish__link:hover {
  text-decoration: underline;
}
.dshFish__link--source {
  font-weight: 500;
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
  color: var(--dsw-alias-state-error-primary, #dc2626);
}
.dshFish__notice {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.dshFish__device {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  padding: 12px;
  background: var(--dsw-alias-bg-secondary);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
}
.dshFish__code {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.05em;
  font-family: monospace;
}
.dshFish__waitingRow {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dshFish__signedOut {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

/* Avatar Component */
.dshFish__avatar {
  border-radius: 50%;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--dsw-alias-bg-secondary);
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
  flex-shrink: 0;
  user-select: none;
}
.dshFish__avatarImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.dshFish__avatarInitial {
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
}

/* Tooltip Component */
.dshFish__tooltipWrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.dshFish__avatarTrigger {
  cursor: pointer;
  display: inline-flex;
  border-radius: 50%;
  transition: transform 0.15s ease;
}
.dshFish__avatarTrigger:hover {
  transform: scale(1.04);
}
.dshFish__tooltip {
  position: absolute;
  z-index: 1000;
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  background: var(--dsw-alias-bg-secondary, #222);
  color: var(--dsw-alias-label-primary, #fff);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.15));
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  opacity: 0;
  animation: dshFishTooltipFade 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.dshFish__tooltip--top {
  bottom: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%);
}
.dshFish__tooltip--bottom {
  top: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%);
}
@keyframes dshFishTooltipFade {
  from { opacity: 0; transform: translate(-50%, 3px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

/* Account Card */
.dshFish__accountCard {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  padding: 16px 18px;
  background: var(--dsw-alias-bg-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.dshFish__accountInfo {
  display: flex;
  align-items: center;
  gap: 14px;
}
.dshFish__accountText {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dshFish__accountName {
  font-size: 15px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.dshFish__accountSub {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}

/* Modal Dialog */
.dshFish__modalOverlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.dshFish__modal {
  background: var(--dsw-alias-bg-primary);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 780px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: dshFishModalEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes dshFishModalEnter {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
.dshFish__modalHead {
  padding: 16px 20px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: var(--dsw-alias-bg-primary);
}
.dshFish__modalHeadTitle {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.dshFish__modalTitle {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: break-word;
}
.dshFish__modalBadges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.dshFish__modalHeadActions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.dshFish__modalClose {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: var(--dsw-alias-label-tertiary);
  padding: 6px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.dshFish__modalClose:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-secondary);
}
.dshFish__modalMeta {
  padding: 12px 20px;
  background: var(--dsw-alias-bg-secondary);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dshFish__modalSummary {
  margin: 0;
  font-size: 13px;
  color: var(--dsw-alias-label-secondary);
  line-height: 1.5;
}
.dshFish__modalMetaRow {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
}
.dshFish__modalBody {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 200px;
}
.dshFish__modalLoading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
}

/* Markdown Prose in Readme Modal */
.dshFish__prose {
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--dsw-alias-label-primary);
  word-break: break-word;
}
.dshFish__h1 { font-size: 20px; font-weight: 700; margin: 18px 0 10px; border-bottom: 1px solid var(--dsw-alias-border-l2); padding-bottom: 6px; }
.dshFish__h2 { font-size: 17px; font-weight: 600; margin: 16px 0 8px; border-bottom: 1px solid var(--dsw-alias-border-l2); padding-bottom: 4px; }
.dshFish__h3 { font-size: 15px; font-weight: 600; margin: 14px 0 6px; }
.dshFish__h4 { font-size: 14px; font-weight: 600; margin: 12px 0 4px; }
.dshFish__h5, .dshFish__h6 { font-size: 13px; font-weight: 600; margin: 10px 0 4px; }
.dshFish__p { margin: 10px 0; }
.dshFish__codeInline {
  background: var(--dsw-alias-bg-secondary);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 4px;
  padding: 2px 5px;
  font-family: monospace;
  font-size: 0.9em;
  color: var(--dsw-alias-label-primary);
}
.dshFish__codeBlock {
  margin: 14px 0;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  overflow: hidden;
  background: var(--dsw-alias-bg-secondary);
}
.dshFish__codeBlockHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-primary);
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.dshFish__codeLang {
  font-family: monospace;
  text-transform: lowercase;
}
.dshFish__codeCopyBtn {
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
}
.dshFish__codeCopyBtn:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-secondary);
}
.dshFish__pre {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.6;
}
.dshFish__ul, .dshFish__ol {
  margin: 10px 0;
  padding-left: 22px;
}
.dshFish__ul li, .dshFish__ol li {
  margin: 4px 0;
}
.dshFish__blockquote {
  margin: 12px 0;
  padding: 4px 12px;
  border-left: 3px solid var(--dsw-alias-state-business-primary, #0070f3);
  background: var(--dsw-alias-bg-secondary);
  border-radius: 0 6px 6px 0;
  color: var(--dsw-alias-label-secondary);
}
.dshFish__hr {
  border: 0;
  border-top: 1px solid var(--dsw-alias-border-l2);
  margin: 18px 0;
}
.dshFish__tableWrapper {
  margin: 14px 0;
  overflow-x: auto;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
}
.dshFish__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.dshFish__table th, .dshFish__table td {
  padding: 7px 11px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  text-align: left;
}
.dshFish__table th {
  background: var(--dsw-alias-bg-secondary);
  font-weight: 600;
}
.dshFish__table tr:last-child td {
  border-bottom: 0;
}
.dshFish__proseImg {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 10px 0;
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
