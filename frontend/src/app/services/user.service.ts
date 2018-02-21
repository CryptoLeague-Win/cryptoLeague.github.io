import { Injectable } from '@angular/core';
import { Http, Headers, Response, RequestOptions } from '@angular/http';
import { AuthenticationService } from './authentication.service';
import { environment } from '../../environments';
import { User } from '../user';
import 'rxjs/add/operator/map'

@Injectable()
export class UserService {

	users = {};
  constructor(
  	private http: Http,
		private authService: AuthenticationService
	) { }

  getRankings() {
   	return this.http.post(environment.apiUrl+'/app/all_users', {'pageno': 0} ,this.authService.generateJwt()).map((response: Response) => response.json());
  }

}
