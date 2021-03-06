import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../user';
import { AuthenticationService, UserService, AlertService } from '../services/index'; 
import { Trie } from '../trie'

@Component({
  selector: 'app-leaderboard',
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss']
})

// interface LeaderboardUser {
//   rank: number, username: string, tokens: number
// }

export class LeaderboardComponent implements OnInit {


	user: User;
	allUsers: any[] = [];
  currentUser: any;
  currentPage: number = 1;
  totalUsers: number;
  usernames: String[];
  trieDS: Trie;
  searchResults: any[];

	// tmp = [{rank: 1, username: "ritw123", tokens: 1000}, 
	// 				{rank: 2, username: "bobby", tokens: 100},
	// 				{rank: 3, username: "nissu", tokens: 10},
	// 				{rank: 4, username: "utky", tokens: 1}];	

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private userService: UserService,
    private alertService: AlertService
  ) { 
    this.trieDS = new Trie();
    //this.trieDS.children[""] = new Trie();
  }

  clickPrev() {
    if(this.currentPage > 1) {
      this.currentPage--;
      this.getRankings();
    }
    // console.log("after prev click: ", this.currentPage);

  }

  clickNext() {
    if(this.currentPage < (this.totalUsers/25)) {
      this.currentPage++;
      this.getRankings();
    }
    // console.log("after next click: ", this.currentPage);
  }

  getRankings() {
    this.userService.getRankings(this.currentPage)
        .subscribe(
          result => {
            //this.allUsers = result;
            this.allUsers = [];
            for(var i=0; i<result.length; i++) {
              var tmpUser = {
                username : result[i].username,
                rank : (this.currentPage-1)*25 + (i+1),
                tokens : result[i].tokens,
                profilePicture: result[i].profilePicture
              };
              this.allUsers.push(tmpUser);
            } 
            console.log(result);
          }, error => {
            this.alertService.error(JSON.parse(error._body).message);
            console.log(error);
          }
      );
  }

  onSearchChange(value: String) {
    if(value == "") {
      this.searchResults = [];
    } else {
      this.searchResults = this.trieDS.findWord(value);
    }
  }

  onUserClick(username: String) {
    this.router.navigate(['/user/'+username]);
  }

  ngOnInit() {
    //this.currentPage = 1;
  	//this.allUsers = this.tmp;
    this.user = this.authService.loadUserFromLocalStorage();
 
    this.getRankings();
 
    this.userService.getCurrentUserRank(this.user)
      .subscribe(
        result => {
          console.log("Get current user rank: ",result.rank);
          var tmp = {
            rank : result.rank,
            username : this.user.username,
            tokens : this.user.tokens
          };
          this.currentUser = tmp;
        }, error => {
          this.alertService.error(JSON.parse(error._body).message);
          console.log(error);
        }
    );

    this.userService.getTotalUsers()
      .subscribe(
        result => {
          console.log("total users:  ", result.totalUsers);
          this.totalUsers = result.totalUsers;
        }, error => {
          this.alertService.error(JSON.parse(error._body).message);
          console.log(error);
        }
    );

    this.userService.getAllUsernames()
        .subscribe(
          result => {
            this.usernames = result;
            //console.log(this.usernames);
            for(let i = 0; i < this.usernames.length; i++) {
              this.trieDS.addWord(this.usernames[i]);
            }
          }, error => {
            this.alertService.error(JSON.parse(error._body).message);
            console.log(error);
          }
      );
  }

}
