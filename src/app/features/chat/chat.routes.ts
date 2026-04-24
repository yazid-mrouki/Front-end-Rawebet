import { Routes } from '@angular/router';
import { ChatRoomComponent } from './pages/chat-room/chat-room.component';

export const CHAT_ROUTES: Routes = [

  // /chat → formulaire de saisie du code
  { path: '', component: ChatRoomComponent },

  // /chat/join → formulaire de saisie du code (URL explicite)
  { path: 'join', component: ChatRoomComponent },

  // /chat/join/1234 → rejoindre directement avec le code
  { path: 'join/:code', component: ChatRoomComponent }

];
