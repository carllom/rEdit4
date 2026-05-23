import { createRouter, createWebHashHistory } from 'vue-router'
import ImageEditorView from '../views/ImageEditorView.vue'
import SpriteEditorView from '../views/SpriteEditorView.vue'
import AnimationEditorView from '../views/AnimationEditorView.vue'
import SheetEditorView from '../views/SheetEditorView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',           component: ImageEditorView    },
    { path: '/sprite',     component: SpriteEditorView   },
    { path: '/animation',  component: AnimationEditorView },
    { path: '/sheet',      component: SheetEditorView    },
  ],
})
