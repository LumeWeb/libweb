interface Portal {
  id: string;
  name: string;
  url: string;
}

const NO_PORTALS_ERROR = new Error("no active portals");

export { Portal, NO_PORTALS_ERROR };
