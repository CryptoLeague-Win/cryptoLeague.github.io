import { Component, OnInit, Input } from '@angular/core';
import { User } from '../user';
import { NgForm, NgModel, NG_VALUE_ACCESSOR, FormGroup,FormBuilder,Validators } from '@angular/forms';
import { AuthenticationService, UserService, AlertService } from '../services/index';
import { Router } from '@angular/router';

declare var UIkit: any;

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})

export class LandingComponent implements OnInit {

	user: User;
	userExists: boolean;
	loading: boolean = false;

	constructor(
		private router: Router,
    private authService: AuthenticationService,
    private userService: UserService,
    private alertService: AlertService
  ) { }
  submitted = false;
 
  onSubmit(form) { 
  	this.submitted = true;
  	console.log('username: ',this.user.username);
  	this.loading = true;
  	this.userService.isUsernameValid(this.user)
  		.subscribe(
  			result => {
	          console.log("user exists: ",result);
	          if(!result.exists) {
	          	this.userService.updateUser(this.user)
					      .subscribe(
					        result => {
					        	this.loading = false;
					          console.log(result);
					          this.authService.saveJwt(result.jwt);
					          this.router.navigate(['/dashboard']);

					        }, error => {
					        	this.loading = false;
					        	this.alertService.error(JSON.parse(error._body).message);
					          console.log(error);
					        }
					    	);
	          } else {
	          	this.loading = false;
	          	this.userExists = true;
	          }
	        }, error => {
	        	this.loading = false;
	        	this.alertService.error(JSON.parse(error._body).message);
	          console.log(error);
	        }
  		)
  }

  ngOnInit() {
  	this.user = this.authService.loadUserFromLocalStorage();
  	this.userExists = false;
  	//console.log(this.user);
  }

}