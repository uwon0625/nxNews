import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { StoryListComponent } from './story-list.component';
import { StoryItemComponent } from '../story-item/story-item.component';
import { NewsService } from '../../services/news.service';
import { MaterialModule } from '../../material.module';
import { of } from 'rxjs';

describe('StoryListComponent', () => {
  let component: StoryListComponent;
  let fixture: ComponentFixture<StoryListComponent>;
  let newsServiceSpy: jasmine.SpyObj<NewsService>;

  const mockStories = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    title: `Story ${i + 1}`,
    url: `http://test${i + 1}.com`
  }));

  beforeEach(async () => {
    newsServiceSpy = jasmine.createSpyObj('NewsService', ['getNewStories', 'searchStories', 'getStories']);
    
    newsServiceSpy.getNewStories.and.returnValue(of(mockStories));
    newsServiceSpy.searchStories.and.returnValue(of(mockStories.slice(0, 5)));
    newsServiceSpy.getStories.and.returnValue(of(mockStories.slice(20, 30)));

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MaterialModule,
        BrowserAnimationsModule,
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
    expect(newsServiceSpy.getNewStories).toHaveBeenCalledWith(10);
    expect(component.allLoadedStories.length).toBe(20);
    expect(component.stories.length).toBe(10);
  });

  it('should handle page change', () => {
    component.onPageChange({ 
      pageIndex: 1, 
      pageSize: 10, 
      length: component.allLoadedStories.length 
    });

    expect(component.currentPage).toBe(2);
    expect(component.stories[0].id).toBe(11);
  });

  it('should handle search', () => {
    component.searchText = 'test';
    component.handleSearch();
    
    expect(component.isSearchMode).toBeTrue();
    expect(newsServiceSpy.searchStories).toHaveBeenCalledWith('test', 10);
  });

  it('should clear search', () => {
    component.searchText = 'test';
    component.isSearchMode = true;
    
    component.clearSearch();
    
    expect(component.searchText).toBe('');
    expect(component.isSearchMode).toBeFalse();
  });
});
