export {
    Router,
    Route,
    useParams,
    Redirect,
    useHistory
} from 'react-router-dom';

export {AsyncLoader} from "./AsyncLoader";
export {ProtectedRoute} from "./ProtectedRoute";
export { RouterHistory } from "./History";

export function useQueryParam(name:string) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}