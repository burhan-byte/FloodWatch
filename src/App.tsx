import { Route, Switch } from 'wouter';
import { Layout } from './components/Layout';
import CaseDetail from './pages/CaseDetail';
import Home from './pages/Home';
import NewRequest from './pages/NewRequest';

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/new" component={NewRequest} />
        <Route path="/r/:id">{(p) => <CaseDetail key={p.id} />}</Route>
        <Route>
          <p className="text-slate-400">ไม่พบหน้านี้</p>
        </Route>
      </Switch>
    </Layout>
  );
}
