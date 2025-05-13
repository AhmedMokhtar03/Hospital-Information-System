
import React from 'react';
import Card from '../components/Card.tsx';
import LoginForm from '../components/Loginform.tsx';
import './authPage.css';


const LogInPage = () => {
    return (
        <div className="app">
          <div className="login-body">
            <Card>
              <LoginForm />
            </Card>
          </div>
        </div>
      );
    };
export default LogInPage;