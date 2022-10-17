import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

import { contractABI, contractAddress } from '../utils/constants';

export const TransactionContaxt = React.createContext();

const { ethereum } = window;

const getEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer);

    return transactionContract;
}

export const TransactionProvider = ({children}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [connectedAccount, setConnectedAccount] = useState("");
    const [formData, setFormData] = useState({addressTo: '', amount: '', keyword: '', message: ''});
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem('transactionCount'));
    
    const handleChange = (e, name) => {
        setFormData((prevState)=>({...prevState, [name]: e.target.value}));
    }

    const getAllTransactions = async () => {
        try {
          if (ethereum) {
            const transactionsContract = getEthereumContract();
    
            const availableTransactions = await transactionsContract.getAllTransactions();
    
            const structuredTransactions = availableTransactions.map((transaction) => ({
              addressTo: transaction.receiver,
              addressFrom: transaction.sender,
              timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
              message: transaction.message,
              keyword: transaction.keyword,
              amount: parseInt(transaction.amount._hex) / (10 ** 18)
            }));
    
            console.log(structuredTransactions);
    
            setTransactions(structuredTransactions);
          } else {
            console.log("Ethereum is not present");
          }
        } catch (error) {
          console.log(error);
        }
      };

    const checkIfWalletIsConnected = async() => {
        try {
            if(!ethereum) return alert("Please install metamask");
            const accounts = await ethereum.request({ method: 'eth_accounts' });
            if(accounts.length){
                setConnectedAccount(accounts[0])
                getAllTransactions();
            }
            else
                console.log("No account found");

        } catch(error) {
            console.log("error");
            throw new Error("no etherum object");
        }
    }

    const checkIfTransactionsExists = async () => {
        try {
          if (ethereum) {
            const transactionsContract = getEthereumContract();
            const currentTransactionCount = await transactionsContract.getTransactionCount();
    
            window.localStorage.setItem("transactionCount", currentTransactionCount);
          }
        } catch (error) {
          console.log(error);
    
          throw new Error("No ethereum object");
        }
      };
    

    const connectWallet = async () => {
        try{
            if(!ethereum) return alert("Please install metamask");
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            setConnectedAccount(accounts[0]);

        } catch(error) {
            console.log("error");
            throw new Error("no etherum object");
        }
    }

    const sendTransaction = async () => {
        try{
            if(!ethereum) return alert("Please install metamask");
            // get the data from the forom
            const { addressTo, amount, keyword, message } = formData;
            const transactionContract = getEthereumContract();
            const parsedAmount = ethers.utils.parseEther(amount);

            await ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: connectedAccount,
                    to: addressTo,
                    gas: '0x5208', //23000 gwei
                    value: parsedAmount._hex, //0.00001 is decimat so we converted
                }]
            });
            const trasactionHash = await transactionContract.addToBlockchain(addressTo, parsedAmount, message, keyword);
            
            setIsLoading(true);
            console.log(`loading - ${trasactionHash.hash}`);
            
            await trasactionHash.wait();
            setIsLoading(false);
            console.log(`success - ${trasactionHash.hash}`);

            const count = await transactionContract.getTracsactionCount();
            setTransactionCount(count.toNumber());

        } catch(error) {
            console.log("error");
            throw new Error("no etherum object");
        }
    }

    useEffect(() => {
        checkIfWalletIsConnected();
        checkIfTransactionsExists();
    }, []);

    return(
       <TransactionContaxt.Provider value={{
            connectWallet, 
            connectedAccount, 
            formData,
            isLoading, 
            sendTransaction, 
            handleChange,
            transactions
            }}>
         {children}
       </TransactionContaxt.Provider> 
    )
}