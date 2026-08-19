/**
 * Public API of the community-toasts widget.
 *
 * `readDismissedToasts` is part of it because the decision belongs to the
 * root loader: the cookie is only readable on the server, and reading it there
 * is what keeps a dismissed toast from ever reaching the client.
 */
export { CommunityToasts, type CommunityToastsProps } from './ui/community-toasts'
export {
  COMMUNITY_COOKIE,
  COMMUNITY_TOAST_IDS,
  readDismissedToasts,
  writeDismissedToasts,
  type CommunityToastId,
} from './model/dismissal'
