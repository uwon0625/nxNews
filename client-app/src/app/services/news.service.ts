import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Story } from '../models/story';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private apiUrl = `${environment.apiUrl}/News`;

  constructor(private http: HttpClient) {
    console.log('API URL:', this.apiUrl);
  }

  getNewStories(size: number = 20): Observable<Story[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.get<Story[]>(`${this.apiUrl}`, { headers })
      .pipe(
        tap(response => console.log('Response:', response))
      );
  }

  searchStories(searchText: string, size: number = 20): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.apiUrl}/search/${searchText}?size=${size}`);
  }

  getStories(startId: number, size: number = 20): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.apiUrl}/stories?startId=${startId}&size=${size}`);
  }
} 