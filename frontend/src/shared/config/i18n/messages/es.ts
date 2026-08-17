import type { Catalog } from './en'

/** Spanish. */
export const es: Catalog = {
  'app.name': 'dsh.fish',
  'app.tagline': 'El hub de plugins para DeepSeek Harness',
  'app.description':
    'Descubre, distribuye e instala bundles, skills, servidores MCP, presets de agente, puentes de hooks y perfiles para dsh.',

  'nav.browse': 'Explorar',
  'nav.docs': 'Documentación',
  'nav.submit': 'Publicar',
  'nav.dashboard': 'Panel',
  'nav.signIn': 'Iniciar sesión',
  'nav.signOut': 'Cerrar sesión',
  'nav.search': 'Buscar plugins',
  'nav.searchHint': 'Pulsa ⌘K',
  'nav.language': 'Idioma',
  'nav.menu': 'Menú',
  'nav.harness': 'DeepSeek Harness',

  'a11y.skipToContent': 'Saltar al contenido',
  'theme.toLight': 'Cambiar al tema claro',
  'theme.toDark': 'Cambiar al tema oscuro',

  'artifactKind.bundle.label': 'Bundle',
  'artifactKind.bundle.description':
    'Un paquete npm que declara dsh.bundle: la unidad que instala `dsh plugin add`.',
  'artifactKind.bundle.plural': 'Bundles',
  'artifactKind.profile.label': 'Perfil',
  'artifactKind.profile.description':
    'Una composición ejecutable completa: una pila ordenada de bundles.',
  'artifactKind.profile.plural': 'Perfiles',
  'artifactKind.skill.label': 'Skill',
  'artifactKind.skill.description':
    'Instrucciones reutilizables para el agente que el modelo carga bajo demanda, como SKILL.md.',
  'artifactKind.skill.plural': 'Skills',
  'artifactKind.mcpServer.label': 'Servidor MCP',
  'artifactKind.mcpServer.description':
    'Un servidor externo de Model Context Protocol montado como herramientas nativas.',
  'artifactKind.mcpServer.plural': 'Servidores MCP',
  'artifactKind.agentPreset.label': 'Preset de agente',
  'artifactKind.agentPreset.description':
    'Una composición de herramientas, secciones de prompt y persona para un agente.',
  'artifactKind.agentPreset.plural': 'Presets de agente',
  'artifactKind.hookBridge.label': 'Puente de hooks',
  'artifactKind.hookBridge.description':
    'Ejecuta dentro de dsh los hooks de shell que ya tienes en Claude Code o Codex.',
  'artifactKind.hookBridge.plural': 'Puentes de hooks',

  'category.coding': 'Programación',
  'category.research': 'Investigación',
  'category.data': 'Datos',
  'category.devops': 'DevOps',
  'category.productivity': 'Productividad',
  'category.communication': 'Comunicación',
  'category.design': 'Diseño',
  'category.security': 'Seguridad',
  'category.testing': 'Pruebas',
  'category.models': 'Modelos',
  'category.ui': 'Interfaz',
  'category.other': 'Otros',

  'home.heroTitle': 'Todo es un plugin.',
  'home.heroSubtitle':
    'Bundles, skills, servidores MCP y presets para DeepSeek Harness. Copia un comando, o deja que tu agente lo instale por ti.',
  'home.searchPlaceholder': 'postgres, revisión de código, navegador…',
  'home.searchAction': 'Buscar',
  'home.browseAll': 'Explorarlo todo',
  'home.installHub': 'Instalar el plugin del hub',
  'home.trending': 'En tendencia',
  'home.recentlyUpdated': 'Actualizado hace poco',
  'home.byKind': 'Por tipo',
  'home.statsArtifacts': 'artefactos indexados',
  'home.seeRecent': 'Ver qué cambió',

  'browse.title': 'Explorar',
  'browse.filters': 'Filtros',
  'browse.kind': 'Tipo',
  'browse.category': 'Categoría',
  'browse.verifiedOnly': 'Solo verificados',
  'browse.sort': 'Ordenar',
  'browse.sort.relevance': 'Relevancia',
  'browse.sort.popular': 'Populares',
  'browse.sort.recent': 'Actualizados hace poco',
  'browse.sort.name': 'Nombre',
  'browse.empty': 'Todavía no hay nada que coincida con esos filtros.',
  'browse.emptyHint': 'Prueba a quitar un filtro, o publica un plugin que conozcas.',
  'browse.resultCount': 'resultados',
  'browse.clearFilters': 'Quitar filtros',
  'browse.searchTitle': 'Resultados para «{query}»',
  'browse.previous': 'Página anterior',
  'browse.next': 'Página siguiente',
  'browse.pagination': 'Paginación',

  'collection.kind.title': '{kind} para DeepSeek Harness',
  'collection.kind.description':
    '{count} {kind} indexados para DeepSeek Harness. Lee el plan de instalación y copia un comando.',
  'collection.category.title': 'Plugins de {category} para DeepSeek Harness',
  'collection.category.description':
    '{count} plugins de DeepSeek Harness para {category}: bundles, skills, servidores MCP y presets de agente, cada uno con su plan de instalación resuelto.',
  'collection.everything': 'Todos los plugins',

  'artifact.verified': 'Verificado',
  'artifact.verifiedTitle': 'El autor demostró que controla esta fuente.',
  'artifact.deprecated': 'Obsoleto',
  'artifact.installs': 'instalaciones',
  'artifact.stars': 'estrellas',
  'artifact.downloads': 'descargas semanales',
  'artifact.source': 'Fuente',
  'artifact.license': 'Licencia',
  'artifact.updated': 'Actualizado',
  'artifact.readme': 'Readme',
  'artifact.install': 'Instalar',
  'artifact.noReadme': 'Este artefacto no incluye readme.',
  'artifact.categories': 'Categorías',
  'artifact.keywords': 'Palabras clave',

  'install.title': 'Instalar',
  'install.viaPlugin': 'Con el plugin del hub',
  'install.viaCli': 'Con la CLI',
  'install.viaPluginBody':
    'Con el plugin del hub instalado, pídele a tu agente que lo instale por su nombre: resuelve el mismo plan que ves aquí.',
  'install.profileLabel': 'Perfil',
  'install.credentials': 'Credenciales que necesita este artefacto',
  'install.credentialsBody':
    'Defínelas como variables de entorno o a través de `ctx.credentials`. El registro solo guarda la referencia, nunca el valor.',
  'install.warning.buildAllowance':
    'Este paquete se compila desde el código fuente al instalarse. pnpm te pedirá permiso para su script de compilación: eso es permiso para ejecutar el código del paquete en tu máquina, fuera del sandbox del agente. Concédelo solo a fuentes en las que confíes.',
  'install.warning.unpinnedGitSpec':
    'Esta fuente no fija ningún commit, así que un push posterior cambia lo que se instala. Es preferible fijar un commit.',
  'install.warning.profileOrder':
    'Los bundles se aplican en el orden listado y la capa posterior gana en cada fila. Instálalos en el orden mostrado.',
  'install.warning.credentialsNeeded': 'Este servidor necesita credenciales antes de conectarse.',
  'install.warning.hookExecutesShell':
    'Los puentes de hooks ejecutan tus hooks de shell en los eventos del ciclo de vida del harness.',

  'submit.title': 'Publicar un plugin',
  'submit.body':
    'Apunta el registro a un paquete npm o a un repositorio de GitHub. Lo indexa el mismo lector que usa el crawler, así que lo que aparece es exactamente lo que el harness cargaría.',
  'submit.kind': 'Tipo',
  'submit.source': 'Fuente',
  'submit.sourcePlaceholder': 'github:owner/repo o npm:@scope/package',
  'submit.note': 'Nota para quien revise',
  'submit.action': 'Publicar',
  'submit.approved': 'Aprobado y publicado: este artefacto es tuyo.',
  'submit.pending': 'Enviado. Aparecerá cuando lo revise una persona mantenedora.',
  'submit.signInRequired': 'Inicia sesión para publicar un plugin.',

  'auth.signInTitle': 'Iniciar sesión',
  'auth.signInSubtitle':
    'Publica plugins, reclama lo que mantienes y autoriza tu harness.',
  'auth.withGithub': 'Continuar con GitHub',
  'auth.withEmail': 'Continuar con email',
  'auth.email': 'Email',
  'auth.password': 'Contraseña',
  'auth.signUp': 'Crear una cuenta',
  'auth.haveAccount': '¿Ya tienes cuenta?',
  'auth.failed': 'No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo.',
  'account.menu': 'Cuenta',

  'device.title': 'Autoriza tu harness',
  'device.subtitle': 'Introduce el código que aparece en tu terminal.',
  'device.codeLabel': 'Código de dispositivo',
  'device.approve': 'Autorizar',
  'device.deny': 'Denegar',
  'device.approved': 'Autorizado. Ya puedes volver a tu terminal.',
  'device.denied': 'Denegado. No se autorizó nada.',
  'device.invalid': 'Ese código no es válido o ha caducado.',
  'device.signInFirst': 'Inicia sesión primero y luego introduce el código de tu terminal.',
  'device.grantExplain':
    'Al autorizar, ese harness podrá leer el catálogo y resolver planes de instalación como tú. No puede publicar ni reclamar plugins en tu nombre.',

  'dashboard.title': 'Panel',
  'dashboard.mySubmissions': 'Mis envíos',
  'dashboard.myArtifacts': 'Artefactos que mantengo',
  'dashboard.noSubmissions': 'Todavía no hay envíos.',
  'dashboard.status.pending': 'Pendiente de revisión',
  'dashboard.status.approved': 'Publicado',
  'dashboard.status.rejected': 'Rechazado',

  'docs.title': 'Publicar en dsh.fish',
  'docs.intro':
    'Etiqueta tu repositorio con el topic dsh-plugin, o envíalo directamente. El registro lee tu manifiesto real: lo que aparece listado es lo que el harness cargaría.',
  'docs.bundle.title': 'Un bundle declara dsh.bundle',
  'docs.bundle.body':
    'Un paquete sin esa declaración se instala igualmente, pero el harness no activa ninguna capa para él, así que el registro tampoco lo lista como plugin.',
  'docs.bundle.note':
    'Publicar en npm distribuye código ya compilado, así que nadie necesita dar permisos de compilación. Una instalación desde git descarga las fuentes: añade un script prepare autocontenido y cuenta con que la gente tendrá que permitirlo.',
  'docs.skill.title': 'Una skill es un SKILL.md con frontmatter',
  'docs.skill.body':
    'name debe ir en kebab-case y description es obligatorio: el proveedor descarta la skill a la que le falte cualquiera de los dos.',
  'docs.mcp.title': 'Un servidor MCP es una fila de cliente',
  'docs.mcp.body':
    'El registro guarda referencias a credenciales, nunca valores. Declara los nombres de las variables de entorno que necesita tu servidor y el harness las resuelve mediante ctx.credentials.',
  'docs.preset.title': 'Un preset de agente es un solo agent.cordis.yml',
  'docs.preset.body':
    'Ponlo en la raíz del repositorio (o en el subdirectorio enviado). El nombre del directorio se convierte en el id del preset.',
  'docs.profile.title': 'Un perfil lista bundles en orden',
  'docs.profile.body':
    'La capa posterior gana en cada fila, y un patch reemplaza toda la configuración de la fila en lugar de fusionarla en profundidad: por eso el orden importa.',

  'notFound.title': 'Aquí no hay nada',
  'notFound.body': 'Esa página no existe.',
  'notFound.home': 'Volver al hub',

  'common.copy': 'Copiar',
  'common.copied': 'Copiado',
  'common.loading': 'Cargando',
  'common.error': 'Algo salió mal.',
  'common.retry': 'Reintentar',

  'seo.home.title': '{name} — {tagline}',
  'seo.browse.description':
    'Busca entre todos los bundles, skills, servidores MCP, presets de agente, puentes de hooks y perfiles indexados para DeepSeek Harness.',
  'seo.artifact.description':
    '{summary} Un {kind} para DeepSeek Harness: copia un comando para instalarlo.',
  'seo.docs.description':
    'Qué debe declarar un repositorio o paquete npm para que el crawler de dsh.fish lo indexe como bundle, skill, servidor MCP, preset de agente o perfil.',
}
