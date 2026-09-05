/// <reference types="@blueos" />
type Router = typeof import('@blueos.app.appmanager.router');
type Storage = typeof import('@blueos.storage.storage');

declare const global: {
  router: Router;
  storage: Storage;
}
