export const triggerReloadInventario = () => {
  window.dispatchEvent(new Event("reload_inventario"));
};
