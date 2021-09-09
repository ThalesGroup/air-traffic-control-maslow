import * as chai from 'chai';
import chaiShallowDeepEqual from 'chai-shallow-deep-equal';

chai.use(chaiShallowDeepEqual);
chai.should();
export const expect = chai.expect;