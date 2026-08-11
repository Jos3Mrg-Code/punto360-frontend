# PUNTO 360 — Frontend

Aplicación web de punto de venta (POS) construida con React + TypeScript. Permite gestionar ventas, inventario, compras, clientes y reportes desde cualquier navegador, incluyendo dispositivos móviles.

## Stack tecnológico

| Herramienta | Versión | Uso |
|---|---|---|
| React | 19 | Framework UI |
| TypeScript | 5.9 | Tipado estático |
| Vite | 7 | Bundler y servidor de desarrollo |
| Tailwind CSS | 4 | Estilos |
| React Router | 7 | Enrutamiento |
| Axios | 1.13 | Peticiones HTTP al backend |
| Recharts | 3 | Gráficas en dashboard y reportes |
| html5-qrcode | 2.3 | Escáner de códigos de barras por cámara |
| QZ Tray | 2.2 | Impresión directa de etiquetas ZPL |
| jwt-decode | 4 | Decodificación de tokens JWT en cliente |

## Módulos

### Autenticación
- Registro de empresa con verificación de correo electrónico
- Login con JWT (expiración validada en cliente)
- Recuperación y restablecimiento de contraseña por email
- Protección de rutas por rol (`PrivateRoute`, `SuperAdminRoute`)

### POS — Punto de venta (`/ventas`)
- Terminal de ventas con búsqueda rápida de productos por nombre, SKU o código de barras
- Soporte para productos simples y con variantes (talla, color, etc.)
- Múltiples métodos de pago: efectivo, tarjeta, crédito a cartera
- Ventas pendientes: guardar y retomar más tarde
- Impresión de ticket al finalizar la venta

### Inventario (`/inventario`)
- Tabla de productos con filtros por estado (bajo stock, agotado, todos)
- Búsqueda por nombre, SKU o barcode — incluyendo SKUs y barcodes de variantes
- Escáner de código de barras por cámara (funciona en móvil y PC)
- Al escanear una variante se muestra el producto padre completo
- Edición de productos con soporte para variantes y atributos personalizados

### Compras (`/compras`)
- Registro de recepciones de mercancía por proveedor
- Ingreso de cantidades y costos por variante
- Creación de variantes nuevas directamente desde el modal de compra
- Gestión de deudas y pagos a proveedores

### Clientes y Cartera (`/clientes`, `/cartera`)
- Base de datos de clientes
- Ventas a crédito con registro de pagos parciales
- Historial de saldo y movimientos por cliente

### Caja y Arqueos (`/caja`, `/arqueos`)
- Apertura y cierre de turno de caja
- Registro de depósitos, retiros y gastos
- Arqueos con resumen de efectivo y medios de pago

### Historial de ventas (`/historial`)
- Listado de ventas con filtros por fecha, usuario y sucursal
- Detalle de cada venta con items, pagos y estado
- Cancelación y devoluciones

### Reportes (`/reportes`)
- Métricas de ventas, costos y ganancias
- Gráficas de tendencias por período
- Filtros por sucursal, categoría y usuario

### Etiquetas (`/etiquetas`)
- Generación de etiquetas con código de barras (JSBarcode)
- Impresión via QZ Tray (modo ZPL para impresoras térmicas)
- Modo browser para impresoras estándar

### Usuarios y Roles (`/usuarios`)
- Gestión de usuarios por empresa
- Roles personalizados con permisos granulares (RBAC)
- Asignación de usuarios a sucursales específicas

### Cuenta (`/cuenta`)
- Edición de perfil y cambio de contraseña
- Datos de la empresa y sucursales
- Estado del plan de suscripción activo

### Suscripciones (`/planes`)
- Planes disponibles (Trial, Mensual, Anual)
- Proceso de pago con Wompi (gateway colombiano)

### Super Admin (`/superadmin`)
- Panel exclusivo para administrar todas las empresas
- Ver plan activo y estado de suscripción por cliente
- Renovar suscripciones y suspender accesos

## Estructura de carpetas

```
src/
├── api/              # Instancia de Axios y configuración base
├── auth/             # AuthContext, tipos de usuario, JWT handling
├── components/
│   ├── Inventory/    # BarcodeScanner, InventoryFilters, InventoryTable, Stats
│   ├── products/     # NewProductFields (crear/editar productos)
│   └── ui/           # Toast, modales, componentes reutilizables
├── layouts/          # DashboardLayout (sidebar + topbar)
├── pages/            # Una página por módulo
├── routes/           # PrivateRoute, SuperAdminRoute
├── theme/            # ThemeContext (soporte multi-tema)
└── types/            # Declaraciones de tipos globales
```

## Instalación y desarrollo local

```bash
npm install
npm run dev
```

Requiere un archivo `.env` en la raíz:

```env
VITE_API_URL=http://localhost:3000
```

## Build para producción

```bash
npm run build
```

El output en `dist/` se despliega en **Vercel**. El proyecto tiene deploy automático configurado desde el repositorio de producción (`release-punto360-frontend`).

## Roles de usuario

| Rol | Descripción |
|---|---|
| `ADMIN` | Acceso completo a todos los módulos de la empresa |
| `CAJERO` | Ventas, caja y visualización de inventario |
| `MANAGER` | Todo excepto configuración de usuarios y roles |
| `super_admin` | Panel de administración global (todas las empresas) |
