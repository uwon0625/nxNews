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
  private _canGoPrevious = false;
  private _canGoNext = true;

  constructor(private newsService: NewsService) {}

  ngOnInit() {
    this.loadInitialStories();
  }

  loadInitialStories() {
    this.isLoading = true;
    this.error = null;
    
    this.newsService.getNewStories(this.pageSize)
      .subscribe({
        next: (stories) => {
          this.allLoadedStories = stories;
          this.maxId = stories.length > 0 ? stories[0].id : 0;
          this.hasMoreStories = stories.length === this.pageSize;
          this.updateDisplayedStories();
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Failed to load stories';
          this.isLoading = false;
        }
      });
  }

  updateDisplayedStories() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.stories = this.allLoadedStories.slice(startIndex, endIndex);
    
    this._canGoPrevious = this.currentPage > 1;
    this._canGoNext = !this.isLoading;
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updateDisplayedStories();
  }

  get canGoNext(): boolean {
    return !this.isLoading;
  }

  get canGoPrevious(): boolean {
    return this.currentPage > 1 && !this.isLoading;
  }

  nextPage() {
    if (this.canGoNext && !this.isLoading) {
      const nextPageStart = this.currentPage * this.pageSize;
      
      if (nextPageStart + this.pageSize > this.allLoadedStories.length) {
        this.ensureDataLoaded(nextPageStart + this.pageSize);
      } else {
        this.currentPage++;
        this.updateDisplayedStories();
      }
    }
  }

  previousPage() {
    if (this.canGoPrevious) {
      this.currentPage--;
      this.updateDisplayedStories();
    }
  }

  private ensureDataLoaded(requiredCount: number) {
    if (requiredCount > this.allLoadedStories.length) {
      this.isLoading = true;
      const lastStoryId = this.allLoadedStories[this.allLoadedStories.length - 1]?.id;
      
      this.newsService.getStories(lastStoryId, this.pageSize)
        .subscribe({
          next: (newStories) => {
            if (newStories.length > 0) {
              this.allLoadedStories = [...this.allLoadedStories, ...newStories];
              this.hasMoreStories = newStories.length === this.pageSize;
              this.currentPage++;
              this.updateDisplayedStories();
            } else {
              this.hasMoreStories = false;
            }
            this.isLoading = false;
          },
          error: (error) => {
            this.error = 'Failed to load stories';
            this.isLoading = false;
          }
        });
    }
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
    this.updateDisplayedStories();
    this.isLoading = false;
  }

  clearSearch() {
    this.isSearchMode = false;
    this.searchText = '';
    this.lastSearchText = '';
    this.currentPage = 1;

    const neededStories = this.pageSize;
    this.ensureDataLoaded(neededStories);
  }
}

