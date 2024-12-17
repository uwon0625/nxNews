import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StoryItemComponent } from './story-item.component';
import { Story } from '../../models/story';

describe('StoryItemComponent', () => {
  let component: StoryItemComponent;
  let fixture: ComponentFixture<StoryItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoryItemComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StoryItemComponent);
    component = fixture.componentInstance;

    component.story = {
      id: 1,
      title: 'Test Story',
      url: 'http://test.com'
    } as Story;
    component.sequenceNumber = 1;

    fixture.detectChanges();
  });

  it('should display story details', () => {
    // Get the root element first
    const storyItem = fixture.nativeElement.querySelector('.story-item');
    expect(storyItem).toBeTruthy('Story item container not found');

    // Get elements based on actual HTML structure
    const number = storyItem.querySelector('.sequence-number');
    const storyContent = storyItem.querySelector('.story-content');
    const link = storyContent.querySelector('a.story-title');

    // Verify elements exist
    expect(number).toBeTruthy('Sequence number not found');
    expect(storyContent).toBeTruthy('Story content container not found');
    expect(link).toBeTruthy('Link element not found');

    // Verify content
    expect(number.textContent.trim()).toBe('1.');
    expect(link.textContent).toBe('Test Story');
    expect(link.getAttribute('href')).toBe('http://test.com');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
