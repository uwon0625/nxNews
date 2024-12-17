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
    
    // Set mock story data before detectChanges
    component.story = {
      id: 1,
      title: 'Test Story',
      url: 'http://test.com'
    };
    component.sequenceNumber = 1;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display story details', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    
    // Check sequence number
    const sequenceNumber = compiled.querySelector('.sequence-number');
    expect(sequenceNumber?.textContent).toContain('1.');

    // Check story title and link
    const storyLink = compiled.querySelector('.story-title');
    expect(storyLink?.textContent).toContain('Test Story');
    expect(storyLink?.getAttribute('href')).toBe('http://test.com');
  });
});
