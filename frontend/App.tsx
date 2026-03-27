import { NavigationContainer } from '@react-navigation/native';                                                                                    
import { AuthNavigator } from './src/app/navigation/AuthNavigator';                                                                                
         
export default function App() {
  
  return (                                                
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
}
