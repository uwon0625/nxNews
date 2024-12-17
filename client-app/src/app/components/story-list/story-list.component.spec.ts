import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { StoryListComponent } from './story-list.component';
import { StoryItemComponent } from '../story-item/story-item.component';
import { NewsService } from '../../services/news.service';
import { of } from 'rxjs';

describe('StoryListComponent', () => {
  let component: StoryListComponent;
  let fixture: ComponentFixture<StoryListComponent>;
  let newsServiceSpy: jasmine.SpyObj<NewsService>;

  const mockStories = [
    { id: 1, title: 'Story 1', url: 'http://test1.com' },
    { id: 2, title: 'Story 2', url: 'http://test2.com' }
  ];

  beforeEach(async () => {
    newsServiceSpy = jasmine.createSpyObj('NewsService', ['getStories', 'searchStories']);
    
    newsServiceSpy.getStories.and.returnValue(of(mockStories));
    newsServiceSpy.searchStories.and.returnValue(of(mockStories));

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        StoryListComponent,
        StoryItemComponent
      ],
      providers: [
        { provide: NewsService, useValue: newsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial stories', () => {
    expect(newsServiceSpy.getStories).toHaveBeenCalledWith(0, 10);
    expect(component.stories.length).toBe(mockStories.length);
  });

  it('should handle search', () => {
    component.searchText = 'test';
    
    component.handleSearch();
    
    expect(component.isSearchMode).toBeTrue();
    expect(newsServiceSpy.searchStories).toHaveBeenCalledWith('test', 10);
  });

  it('should clear search correctly', () => {
    component.searchText = 'test';
    component.isSearchMode = true;
    
    component.clearSearch();
    
    expect(component.searchText).toBe('');
    expect(component.isSearchMode).toBeFalse();
  });
});
