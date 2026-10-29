import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Chatbot } from './compartidos/chatbot';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Chatbot],
  template: '<router-outlet /><mc-chatbot />',
})
export class App {}
