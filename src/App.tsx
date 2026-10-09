import { Route, Switch } from 'wouter';
import { Layout } from './components/Layout';
import Home from './pages/Home';

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route>
          <p className="text-slate-400">ไม่พบหน้านี้</p>
        </Route>
      </Switch>
    </Layout>
  );
}
