import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Story } from '../models/story';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getNewStories(count: number): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.apiUrl}/News?count=${count}`);
  }

  searchStories(searchText: string, size: number = 20): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.apiUrl}/News/search/${searchText}?size=${size}`);
  }

  getStories(startId: number, size: number = 20): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.apiUrl}/News/stories?startId=${startId}&size=${size}`);
  }
} 