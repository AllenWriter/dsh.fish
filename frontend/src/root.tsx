// Framework entry. The FSD `app` layer owns the implementation.
// Every route-module export the framework looks for must be forwarded here —
// an omitted one (the theme `loader`, for instance) is silently never called.
export { Layout, ErrorBoundary, links, loader, default } from './app/root'
