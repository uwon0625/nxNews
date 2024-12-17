# Introduction

NtNews is a sample Angular v19 web app to pull stories from [Hacker News API](https://github.com/HackerNews/API) via dotnet(SDK v8) Restful API, deployed to Azure. 
 - Source repo: https://github.com/uwon0625/nxNews
 - App link: https://brave-sea-0ef71fa1e.4.azurestaticapps.net

**Features**
- Pagination(with @angular/material/paginator)
- Caching
- Automated end-to-end testing (with Playwright)
- Integrated Unit Testing

# Notes

Hacker News API is very flexible and gives different data fields for different types. This app only pulls for story type("type" : "story") and skip other type like comment, job, poll, etc. Furthermore, we only list the stories with a Url so our users can follow up the link to read more. When we need to fetch for more stories, we have to check each item to check its type, which means pagination and caching are important to keep the app up running.

For a quicker startup, we load latest 20 story ids from https://hacker-news.firebaseio.com/v0/newstories.json, then query each of the story by its id to get the title and Url at https://hacker-news.firebaseio.com/v0/item/{story-id}.json.


## How to use the app

To run it locally:

 - clone it from https://github.com/uwon0625/nxNews.git, 
 - backend(Api): 
	 - cd NewsApi
	 - dotnet clean && dotnet run (required by front end app)
	 - check it live at http://localhost:5175/News (or try swagger at http://localhost:5175/swagger/index.html)
	 - run tests: 
		 - cd .. (repo root, like nxNews)
		 - dotnet test NewsApi.Tests 
		 
 - front end(app)
	 - cd client-app
	 - npm cache clean --force && ng serve
	 - check it at http://localhost:4200/ (need above NewsApi running or no story is loaded)  
	 - run end-to-end tests:  
		 - npm run test:e2e:dev
		 - check result at http://localhost:9323/ (or "npx playwright show-report")
 
## What's next?

We will continue to make improvements for:
 - refine the UX and styling
 - adding more tests
 - refactor to make the code better
 - containerization for scalability
 - persist some of the  data locally(between cache and Hacker News API)
 - authorization(with jwt) to make the app secure and meaningful to our users
 - and more to come

