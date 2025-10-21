import { Notify } from 'quasar';

Notify.setDefaults({
  position: 'top',
  timeout: 1500,
  progress: true,
  actions: [{ icon: 'close', color: 'white' }],
});
