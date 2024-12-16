import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { StoryListComponent } from './story-list.component';
import { NewsService } from '../../services/news.service';
import { StoryItemComponent } from '../story-item/story-item.component';
import { Story } from '../../models/story';

describe('StoryListComponent', () => {
  let component: StoryListComponent;
  let fixture: ComponentFixture<StoryListComponent>;
  let newsService: jasmine.SpyObj<NewsService>;

  // Helper function to create test stories
  const createTestStories = (count: number, startId: number = 1): Story[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: startId + i,
      title: `Test Story ${startId + i}`,
      url: `http://test${startId + i}.com`
    }));
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('NewsService', ['getNewStories', 'getStories', 'searchStories']);
    
    await TestBed.configureTestingModule({
      imports: [FormsModule, StoryListComponent, StoryItemComponent],
      providers: [
        { provide: NewsService, useValue: spy }
      ]
    }).compileComponents();

    newsService = TestBed.inject(NewsService) as jasmine.SpyObj<NewsService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StoryListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial stories on init', fakeAsync(() => {
    const testStories = createTestStories(20);
    newsService.getNewStories.and.returnValue(of(testStories));

    fixture.detectChanges();
    tick();

    expect(component.stories.length).toBe(10); // Default page size
    expect(component.allLoadedStories.length).toBe(20);
    expect(component.currentPage).toBe(1);
  }));

  it('should handle page size change', fakeAsync(() => {
    const testStories = createTestStories(20);
    newsService.getNewStories.and.returnValue(of(testStories));
    
    fixture.detectChanges();
    tick();

    component.pageSize = 5;
    component.onPageSizeChange();
    fixture.detectChanges();

    expect(component.stories.length).toBe(5);
    expect(component.currentPage).toBe(1);
  }));

  it('should handle search', fakeAsync(() => {
    const searchResults = createTestStories(3);
    newsService.searchStories.and.returnValue(of(searchResults));

    component.searchText = 'test';
    component.handleSearch();
    tick();

    expect(component.isSearchMode).toBeTrue();
    expect(component.stories.length).toBe(3);
    expect(component.currentPage).toBe(1);
  }));

  it('should handle next page', fakeAsync(() => {
    const testStories = createTestStories(20);
    newsService.getNewStories.and.returnValue(of(testStories));
    
    fixture.detectChanges();
    tick();

    component.nextPage();
    fixture.detectChanges();

    expect(component.currentPage).toBe(2);
    expect(component.stories.length).toBe(10);
  }));

  it('should handle previous page', fakeAsync(() => {
    const testStories = createTestStories(20);
    newsService.getNewStories.and.returnValue(of(testStories));
    
    fixture.detectChanges();
    tick();

    component.nextPage();
    component.previousPage();
    fixture.detectChanges();

    expect(component.currentPage).toBe(1);
    expect(component.stories.length).toBe(10);
  }));

  it('should clear search correctly', fakeAsync(() => {
    // First do a search
    const searchResults = createTestStories(3);
    newsService.searchStories.and.returnValue(of(searchResults));
    
    component.searchText = 'test';
    component.handleSearch();
    tick();

    // Then clear it
    const regularStories = createTestStories(20);
    newsService.getNewStories.and.returnValue(of(regularStories));
    
    component.clearSearch();
    tick();

    expect(component.isSearchMode).toBeFalse();
    expect(component.searchText).toBe('');
    expect(component.stories.length).toBe(10);
  }));

  it('should handle search pagination', fakeAsync(() => {
    const searchResults = createTestStories(11); // One more than page size
    newsService.searchStories.and.returnValue(of(searchResults));

    component.searchText = 'test';
    component.handleSearch();
    tick();

    expect(component.stories.length).toBe(10);
    expect(component.hasMoreStories).toBeTrue();

    component.nextPage();
    tick();

    expect(component.currentPage).toBe(2);
    expect(component.stories.length).toBe(1);
  }));
});
