import { Routes } from '@angular/router';
import { ChatRoomComponent } from './pages/chat-room/chat-room.component';

export const CHAT_ROUTES: Routes = [

  // Accueil chat — saisie du code
  { path: '', component: ChatRoomComponent },

  // Accès direct via URL avec le code (ex: /chat/join/4782)
  { path: 'join/:code', component: ChatRoomComponent }

];