import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { retry, catchError, timeout } from 'rxjs/operators';
import { Story } from '../models/story';
import { environment } from '../../environments/environment';
import { ErrorHandlerService } from './error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) { }

  getNewStories(count: number): Observable<Story[]> {
    if (count > environment.maxPageSize) {
      return throwError(() => new Error(`Count cannot exceed ${environment.maxPageSize}`));
    }

    return this.http.get<Story[]>(`${this.apiUrl}/News?count=${count}`)
      .pipe(
        timeout(environment.requestTimeout),
        retry(environment.retryCount),
        catchError(error => this.errorHandler.handleError(error))
      );
  }

  searchStories(searchText: string, size: number = 20): Observable<Story[]> {
    if (size > environment.maxPageSize) {
      return throwError(() => new Error(`Size cannot exceed ${environment.maxPageSize}`));
    }

    return this.http.get<Story[]>(`${this.apiUrl}/News/search/${searchText}?size=${size}`)
      .pipe(
        timeout(environment.requestTimeout),
        retry(environment.retryCount),
        catchError(error => this.errorHandler.handleError(error))
      );
  }

  getStories(startId: number, size: number = 20): Observable<Story[]> {
    if (size > environment.maxPageSize) {
      return throwError(() => new Error(`Size cannot exceed ${environment.maxPageSize}`));
    }

    return this.http.get<Story[]>(`${this.apiUrl}/News/stories?startId=${startId}&size=${size}`)
      .pipe(
        timeout(environment.requestTimeout),
        retry(environment.retryCount),
        catchError(error => this.errorHandler.handleError(error))
      );
  }
} 