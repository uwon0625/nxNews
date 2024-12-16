import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Story } from '../../models/story';

@Component({
  selector: 'app-story-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="story-item">
      <span class="sequence-number">{{sequenceNumber}}.</span>
      <div class="story-content">
        <a [href]="story.url" target="_blank" class="story-title">{{ story.title }}</a>
        <!-- other story content -->
      </div>
    </div>
  `,
  styles: [`
    .story-item {
      display: flex;
      gap: 8px;
      padding: 8px 0;
    }
    .sequence-number {
      color: #666;
      min-width: 24px;
      text-align: right;
    }
    .story-content {
      flex: 1;
    }
  `]
})
export class StoryItemComponent {
  @Input() story!: Story;
  @Input() sequenceNumber: number = 0;
}
