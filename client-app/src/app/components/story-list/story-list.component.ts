import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsService } from '../../services/news.service';
import { Story } from '../../models/story';
import { StoryItemComponent } from '../story-item/story-item.component';

@Component({
  selector: 'app-story-list',
  standalone: true,
  imports: [CommonModule, FormsModule, StoryItemComponent],
  templateUrl: './story-list.component.html',
  styleUrls: ['./story-list.component.scss']
})
export class StoryListComponent implements OnInit {
  stories: Story[] = [];
  allLoadedStories: Story[] = [];
  currentPage = 1;
  pageSize = 10;
  maxId = 0;
  isLoading = false;
  error: string | null = null;
  hasMoreStories = true;
  isSearchMode = false;
  searchText = '';
  private lastSearchText = '';

  constructor(private newsService: NewsService) {}

  ngOnInit() {
    this.loadInitialStories();
  }

  loadInitialStories() {
    this.isLoading = true;
    this.error = null;
    
    const storiesNeeded = this.currentPage * this.pageSize;
    
    this.newsService.getNewStories(storiesNeeded)
      .subscribe({
        next: (stories) => {
          console.log('Initial stories loaded:', stories);
          this.allLoadedStories = stories;
          this.maxId = stories.length > 0 ? stories[0].id : 0;
          this.hasMoreStories = stories.length >= this.pageSize;
          this.updateCurrentPageStories();
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Failed to load stories';
          this.isLoading = false;
          console.error('Error:', error);
        }
      });
  }

  onPageSizeChange() {
    const oldPageSize = this.pageSize;
    const currentFirstItemIndex = (this.currentPage - 1) * oldPageSize;
    
    this.currentPage = Math.floor(currentFirstItemIndex / this.pageSize) + 1;
    
    const totalNeeded = this.currentPage * this.pageSize;
    const available = this.allLoadedStories.length;

    if (available >= totalNeeded) {
      this.updateCurrentPageStories();
    } else {
      const needToLoad = totalNeeded - available;
      const lastStory = this.allLoadedStories[available - 1];
      const startId = lastStory ? lastStory.id - 1 : 0;
      
      if (startId > 1) {
        this.loadMoreStories(needToLoad);
      } else {
        this.updateCurrentPageStories();
      }
    }
  }

  updateCurrentPageStories() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    this.stories = this.allLoadedStories.slice(startIndex, endIndex);
    
    if (this.isSearchMode) {
      this.hasMoreStories = this.allLoadedStories.length > endIndex ||
                           this.stories.length === this.pageSize;
    } else {
      const lastStoryId = this.allLoadedStories[this.allLoadedStories.length - 1]?.id;
      this.hasMoreStories = lastStoryId > 1;

      if (this.stories.length < this.pageSize && this.hasMoreStories) {
        const neededStories = this.pageSize - this.stories.length;
        this.loadMoreStories(neededStories);
      }
    }
  }

  loadMoreStories(amount: number = this.pageSize) {
    if (this.isLoading) return;
    
    const requestAmount = Math.min(amount, this.pageSize);
    
    this.isLoading = true;
    this.error = null;
    
    const lastLoadedStory = this.allLoadedStories[this.allLoadedStories.length - 1];
    const startId = lastLoadedStory ? lastLoadedStory.id - 1 : 0;
    
    console.log('Loading more stories with startId:', startId, 'amount:', requestAmount);
    
    this.newsService.getStories(startId, requestAmount)
      .subscribe({
        next: (stories) => {
          console.log('Additional stories loaded:', stories);
          this.allLoadedStories = [...this.allLoadedStories, ...stories];
          this.updateCurrentPageStories();
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Failed to load stories';
          this.isLoading = false;
          console.error('Error:', error);
        }
      });
  }

  previousPage() {
    if (this.currentPage > 1 && !this.isLoading) {
      this.currentPage--;
      this.updateCurrentPageStories();
    }
  }

  nextPage() {
    if (!this.isLoading && this.hasMoreStories) {
      this.currentPage++;
      
      if (this.isSearchMode) {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        if (startIndex < this.allLoadedStories.length) {
          this.updateCurrentPageStories();
        } else {
          this.isLoading = true;
          this.searchFromApi(this.lastSearchText);
        }
      } else {
        const nextPageStart = this.currentPage * this.pageSize;
        if (nextPageStart >= this.allLoadedStories.length) {
          this.loadMoreStories(this.pageSize);
        } else {
          const remainingStories = this.allLoadedStories.length - nextPageStart;
          if (remainingStories < this.pageSize) {
            const neededStories = this.pageSize - remainingStories;
            this.loadMoreStories(neededStories);
          } else {
            this.updateCurrentPageStories();
          }
        }
      }
    }
  }

  get canGoNext(): boolean {
    return this.hasMoreStories && !this.isLoading;
  }

  get canGoPrevious(): boolean {
    return this.currentPage > 1 && !this.isLoading;
  }

  handleSearch() {
    const trimmedText = this.searchText.trim();
    if (trimmedText) {
      this.isSearchMode = true;
      this.isLoading = true;
      this.error = null;
      this.lastSearchText = trimmedText;
      this.currentPage = 1;

      const cachedResults = this.searchInCachedStories(trimmedText);
      
      if (cachedResults.length >= this.pageSize) {
        this.handleSearchResults(cachedResults);
      } else {
        this.searchFromApi(trimmedText);
      }
    }
  }

  private searchFromApi(searchText: string) {
    this.newsService.searchStories(searchText, this.pageSize)
      .subscribe({
        next: (stories) => {
          const allResults = this.mergeSearchResults(
            this.searchInCachedStories(searchText), 
            stories
          );
          this.handleSearchResults(allResults);
        },
        error: (error) => {
          this.error = 'Failed to search stories';
          this.isLoading = false;
          console.error('Error:', error);
        }
      });
  }

  private searchInCachedStories(searchText: string): Story[] {
    const searchLower = searchText.toLowerCase();
    return this.allLoadedStories.filter(story => 
      story.title.toLowerCase().includes(searchLower)
    );
  }

  private mergeSearchResults(cachedResults: Story[], apiResults: Story[]): Story[] {
    const existingIds = new Set(cachedResults.map(story => story.id));
    
    const newResults = apiResults.filter(story => !existingIds.has(story.id));
    
    return [...cachedResults, ...newResults];
  }

  private handleSearchResults(results: Story[]) {
    this.allLoadedStories = results;
    this.updateCurrentPageStories();
    this.isLoading = false;
  }

  clearSearch() {
    this.isSearchMode = false;
    this.searchText = '';
    this.lastSearchText = '';

    const neededStories = this.currentPage * this.pageSize;
    if (this.allLoadedStories.length < neededStories) {
      const startId = this.maxId - ((this.currentPage - 1) * this.pageSize);
      this.loadMoreStories(this.pageSize);
    } else {
      this.updateCurrentPageStories();
    }
  }
}
