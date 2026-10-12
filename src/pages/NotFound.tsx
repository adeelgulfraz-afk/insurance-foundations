import Layout from '../components/Layout'

export default function NotFound() {
  return (
    <Layout title="Page not found">
      <p>That page doesn't exist.</p>
      <a className="btn btn-primary" href="#/">Back to home</a>
    </Layout>
  )
}
