import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Story } from '../../models/story';

@Component({
  selector: 'app-story-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './story-item.component.html',
  styleUrls: ['./story-item.component.scss']
})
export class StoryItemComponent {
  @Input() story!: Story;
  @Input() sequenceNumber: number = 0;
}
