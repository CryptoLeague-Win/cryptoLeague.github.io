import { TestBed, inject } from '@angular/core/testing';
import { HttpModule, Http } from '@angular/http';
import { RouterTestingModule } from '@angular/router/testing';

import { PortfolioService, AuthenticationService } from '../services';

describe('PortfolioService', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [ HttpModule, RouterTestingModule ], 
			providers: [ PortfolioService, AuthenticationService ]
		});
	});

	it('should be created', inject([PortfolioService], (service: PortfolioService) => {
		expect(service).toBeTruthy();
	}));
});
