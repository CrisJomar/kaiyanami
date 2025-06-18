import React from "react";
import Title from "../components/Title";
import { assets } from "../assets/all_products";
import NewsletterBox from "../components/NewsletterBox";

const About = () => {
  return (
    <div>
      <div className="text-2xl text-center pt-8 border-t">
        <Title text1={"ABOUT"} text2={"US"} />
      </div>

      <div className="my-10 flex flex-col md:flex-row gap-16">
        <img
          className="w-full md:max-w-[450px]"
          src={assets.aboutUs}
          alt="Kaiyanami Clothing"
        />
        <div className="flex flex-col justify-center gap-6 md:w-2/4 text-gray-600">
          <p>
            Kaiyanami was founded to bridge the gap between functional gymwear
            and stylish streetwear. We believe in empowering individuals with
            apparel that seamlessly transitions from intense workouts to casual
            outings, blending performance and fashion effortlessly.
          </p>
          <b className="text-gray-800">Our Mission</b>
          <p>
            At Kaiyanami, our mission is to redefine activewear by offering a
            collection that is both durable and versatile. We aim to inspire
            confidence and self-expression, whether you're lifting weights,
            hitting the track, or just enjoying the urban vibe.
          </p>
        </div>
      </div>

      <div className="text-xl py-4">
        <Title text1={"WHY"} text2={"CHOOSE US"} />
      </div>

      <div className="flex flex-col md:flex-row text-sm mb-20">
        <div className="border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5">
          <b>Premium Quality:</b>
          <p className="text-gray-600">
            Our apparel is crafted using high-performance fabrics that offer
            durability, comfort, and style, ensuring you look and feel your
            best.
          </p>
        </div>
        <div className="border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5">
          <b>Versatile Designs:</b>
          <p className="text-gray-600">
            From gym sessions to street outings, our designs cater to both
            active and lifestyle needs without compromising on aesthetics.
          </p>
        </div>
        <div className="border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5">
          <b>Customer-Centric Approach:</b>
          <p className="text-gray-600">
            We prioritize your experience with personalized support and a
            hassle-free shopping journey that ensures satisfaction every step of
            the way.
          </p>
        </div>
      </div>

      <NewsletterBox />
    </div>
  );
};

export default About;
