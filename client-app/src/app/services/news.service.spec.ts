/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NewsService } from './news.service';
import { environment } from '../../environments/environment';

describe('NewsService', () => {
  let service: NewsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NewsService]
    });

    service = TestBed.inject(NewsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();  // Verify no outstanding requests
  });

  beforeAll(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  });

  afterAll(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get stories', () => {
    const mockStories = [
      { id: 1, title: 'Story 1', url: 'http://test1.com' },
      { id: 2, title: 'Story 2', url: 'http://test2.com' }
    ];

    service.getStories(2, 1).subscribe(stories => {
      expect(stories).toEqual(mockStories);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/News/stories?startId=2&size=1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStories);
  });

  it('should search stories', () => {
    const mockResults = [
      { id: 1, title: 'Test Story', url: 'http://test.com' }
    ];

    service.searchStories('test').subscribe(stories => {
      expect(stories).toEqual(mockResults);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/News/search/test?size=20`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResults);
  });
});
