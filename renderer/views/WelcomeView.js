import { DropZone } from '../components/DropZone.js';
import { BaseView } from '../base/BaseView.js';

export class WelcomeView extends BaseView {
  constructor({ dropZoneEl, api, logger }) {
    super();
    this.dropZone = new DropZone({ el: dropZoneEl, api, logger });
  }

  onFileImported(cb) {
    this.dropZone.setOnFileSelected(cb);
  }

  mount() {
    super.mount();
    this.dropZone.mount();
    this.track(() => this.dropZone.unmount());
  }
}
