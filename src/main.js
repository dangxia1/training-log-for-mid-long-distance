import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/shared.css'
import './styles/themes.css'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
