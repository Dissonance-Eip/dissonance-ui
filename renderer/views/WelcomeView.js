import { DropZone } from '../components/DropZone.js';

export class WelcomeView {
  constructor({ dropZoneEl, api, logger }) {
    this.dropZone = new DropZone({ el: dropZoneEl, api, logger });
  }

  onFileImported(cb) {
    this.dropZone.setOnFileSelected(cb);
  }

  mount() {
    this.dropZone.mount();
  }
}
