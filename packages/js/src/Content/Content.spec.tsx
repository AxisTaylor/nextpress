import { render, act } from '@/testing/utils';
import { Content } from '.';

describe('Content ', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(<Content  />);
    });
  });

  it('should match snapshot', () => {
    const { baseElement } = render(<Content />);
    expect(baseElement).toMatchSnapshot();
  });
});