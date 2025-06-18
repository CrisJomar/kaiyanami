import React from 'react'
import Hero from '../components/Hero'
import LatestCollection from '../components/LatestCollection'
import OurPolicy from '../components/OurPolicy'
import NewsletterBox from '../components/NewsletterBox'

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero section - full width */}
      <section className="w-full">
        <Hero />
      </section>

      {/* Latest Collection section */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Latest Collection</h2>
          <LatestCollection />
        </div>
      </section>

      {/* Our Policy section */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <OurPolicy />
        </div>
      </section>

      {/* Newsletter section with gradient background */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-8">Stay Connected</h2>
          <NewsletterBox />
        </div>
      </section>
    </div>
  )
}

export default Home
