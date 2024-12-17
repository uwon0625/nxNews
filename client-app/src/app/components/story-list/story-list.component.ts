import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsService } from '../../services/news.service';
import { Story } from '../../models/story';
import { StoryItemComponent } from '../story-item/story-item.component';
import { MaterialModule } from '../../material.module';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-story-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    StoryItemComponent, 
    MaterialModule
  ],
  templateUrl: './story-list.component.html',
  styleUrls: ['./story-list.component.scss']
})
export class StoryListComponent implements OnInit {
  stories: Story[] = [];
  allLoadedStories: Story[] = [];
  currentPage = 1;
  pageSize = 10;
  isLoading = false;
  error: string | null = null;
  hasMoreStories = true;
  isSearchMode = false;
  searchText = '';
  private lastSearchText = '';
  private _canGoPrevious = false;

  constructor(private newsService: NewsService) {}

  ngOnInit() {
    this.loadStories();
  }

  loadStories() {
    this.isLoading = true;
    this.newsService.getNewStories(this.pageSize)
      .subscribe({
        next: (stories) => {
          this.allLoadedStories = stories;
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

    if (this.isOnLastLoadedPage()) {
      this.prefetchNextPage();
    }
  }

  private isOnLastLoadedPage(): boolean {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return startIndex + this.pageSize >= this.allLoadedStories.length;
  }

  private prefetchNextPage() {
    if (!this.isLoading && this.hasMoreStories) {
      const lastStoryId = this.allLoadedStories[this.allLoadedStories.length - 1]?.id;
      
      if (lastStoryId) {
        this.newsService.getStories(lastStoryId, this.pageSize)
          .subscribe({
            next: (newStories) => {
              if (newStories.length > 0) {
                const existingIds = new Set(this.allLoadedStories.map(story => story.id));
                const uniqueNewStories = newStories.filter(story => !existingIds.has(story.id));
                
                this.allLoadedStories = [...this.allLoadedStories, ...uniqueNewStories];
                this.hasMoreStories = newStories.length === this.pageSize;
              } else {
                this.hasMoreStories = false;
              }
            },
            error: (error) => {
              console.error('Failed to prefetch next page:', error);
            }
          });
      }
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

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
    
    const requiredCount = this.currentPage * this.pageSize;
    if (requiredCount > this.allLoadedStories.length) {
      this.ensureDataLoaded(requiredCount);
    } else {
      this.updateDisplayedStories();
    }
  }

  private ensureDataLoaded(requiredCount: number) {
    if (requiredCount > this.allLoadedStories.length) {
      this.isLoading = true;
      const lastStoryId = this.allLoadedStories[this.allLoadedStories.length - 1]?.id;
      
      if (!lastStoryId) {
        this.error = 'Failed to load more stories';
        this.isLoading = false;
        return;
      }

      this.newsService.getStories(lastStoryId, this.pageSize)
        .subscribe({
          next: (newStories) => {
            if (newStories.length > 0) {
              const existingIds = new Set(this.allLoadedStories.map(story => story.id));
              const uniqueNewStories = newStories.filter(story => !existingIds.has(story.id));
              
              this.allLoadedStories = [...this.allLoadedStories, ...uniqueNewStories];
              this.hasMoreStories = newStories.length === this.pageSize;
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
}



